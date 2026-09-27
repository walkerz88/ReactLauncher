import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { ipcMain } from 'electron';

/**
 * Steam Store lookups used by the "Add a game" wizard to pre-fill a game's data
 * and to download its covers, screenshots and trailer. Everything here talks to
 * the public store API only — no login, no keys.
 */

const REQUEST_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 10 * 60_000;
const MAX_SEARCH_RESULTS = 8;
const MAX_SCREENSHOTS = 8;
export const STEAM_APP_ID_PATTERN = /^\d{1,10}$/;
const CDN_ROOT = 'https://cdn.akamai.steamstatic.com/steam/apps';

export interface SteamSearchResult {
  id: string;
  name: string;
}

export interface SteamFact {
  label: { ru: string; en: string };
  value: string;
}

export interface SteamInfo {
  appId: string;
  name: string;
  /** i18n genre key (e.g. `genre.action`), or `null` if Steam's genres don't map to one. */
  genre: string | null;
  /** 0-10, from the Metacritic score when Steam has one. */
  rating: number | null;
  description: { ru: string | null; en: string | null };
  facts: SteamFact[];
}

export interface SteamAssetsResult {
  covers: boolean;
  screenshots: number;
  trailer: boolean;
}

/** Which pieces to fetch — all `true` by default (a brand-new game), but the library health check's bulk
 * fill turns off whatever a game already has, so it never overwrites a cover that's already fine. */
export interface DownloadSteamAssetsOptions {
  horizontal?: boolean;
  vertical?: boolean;
  trailer?: boolean;
  screenshots?: boolean;
}

interface SteamAppData {
  name?: string;
  short_description?: string;
  about_the_game?: string;
  genres?: Array<{ description?: string }>;
  developers?: string[];
  publishers?: string[];
  release_date?: { date?: string };
  metacritic?: { score?: number };
  screenshots?: Array<{ path_full?: string }>;
  movies?: Array<{ id?: number }>;
}

const GENRE_BY_STEAM_GENRE: Record<string, string> = {
  Action: 'genre.action',
  Adventure: 'genre.adventure',
  RPG: 'genre.rpg',
  Simulation: 'genre.simulation',
  Strategy: 'genre.strategy',
  Racing: 'genre.racing',
  Sports: 'genre.sports',
  Indie: 'genre.indie',
  Casual: 'genre.casual',
};

const HTML_ENTITIES: Record<string, string> = {
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&#39;': "'",
};

/** Store descriptions carry markup and entities; the app renders plain text only. */
function toPlainText(html: string | undefined): string | null {
  const text = (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(quot|amp|lt|gt|nbsp|#39);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();

  return text || null;
}

async function fetchStoreJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function fetchAppData(appId: string, language: 'english' | 'russian'): Promise<SteamAppData | null> {
  const body = (await fetchStoreJson(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&l=${language}`,
  )) as Record<string, { success?: boolean; data?: SteamAppData }> | null;
  // Only ever queried for one id at a time, but Steam sometimes keys the response under a different
  // (internally redirected) app id than the one requested — e.g. asking for 2124490 ("SILENT HILL 2")
  // comes back keyed "3097500" — so the single entry is taken by position, not by re-keying on `appId`.
  const entry = body ? Object.values(body)[0] : undefined;

  return entry?.success && entry.data ? entry.data : null;
}

export async function searchSteam(term: string): Promise<SteamSearchResult[]> {
  const body = (await fetchStoreJson(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=us`,
  )) as { items?: Array<{ id?: number; name?: string }> } | null;

  return (body?.items ?? [])
    .flatMap((item) =>
      typeof item.id === 'number' && typeof item.name === 'string'
        ? [{ id: String(item.id), name: item.name }]
        : [],
    )
    .slice(0, MAX_SEARCH_RESULTS);
}

export async function getSteamInfo(appId: string): Promise<SteamInfo | null> {
  const [en, ru] = await Promise.all([fetchAppData(appId, 'english'), fetchAppData(appId, 'russian')]);
  const base = en ?? ru;

  if (!base?.name) {
    return null;
  }

  const year = /\b(?:19|20)\d{2}\b/.exec(base.release_date?.date ?? '')?.[0];
  const developer = base.developers?.join(', ');
  const publisher = base.publishers?.join(', ');
  const score = base.metacritic?.score;
  const genre = (base.genres ?? []).map((entry) => GENRE_BY_STEAM_GENRE[entry.description ?? '']).find(Boolean);

  const facts: SteamFact[] = [];

  if (year) {
    facts.push({ label: { ru: 'Год выхода', en: 'Release year' }, value: year });
  }

  if (developer) {
    facts.push({ label: { ru: 'Разработчик', en: 'Developer' }, value: developer });
  }

  if (publisher) {
    facts.push({ label: { ru: 'Издатель', en: 'Publisher' }, value: publisher });
  }

  return {
    appId,
    name: base.name,
    genre: genre ?? null,
    rating: typeof score === 'number' ? Math.round(Math.min(100, Math.max(0, score))) / 10 : null,
    // `short_description` is Steam's one-line store teaser, not the "About This Game" text players
    // actually mean by "description" — `about_the_game` is the fuller text, falling back to the
    // teaser only for the rare app that doesn't have one.
    description: {
      ru: toPlainText(ru?.about_the_game) ?? toPlainText(ru?.short_description),
      en: toPlainText(en?.about_the_game) ?? toPlainText(en?.short_description),
    },
    facts,
  };
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  const partial = `${dest}.part`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });

    if (!response.ok || !response.body) {
      return false;
    }

    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), fs.createWriteStream(partial));
    await fs.promises.rename(partial, dest);

    return true;
  } catch {
    try {
      await fs.promises.rm(partial, { force: true });
    } catch {
      // nothing left to clean up
    }

    return false;
  }
}

/** Screenshot URLs come from an API response, so only Steam's own CDN over https is fetched. */
function isSteamCdnUrl(value: string | undefined): value is string {
  try {
    const url = new URL(value ?? '');

    return url.protocol === 'https:' && url.hostname.endsWith('.steamstatic.com');
  } catch {
    return false;
  }
}

/**
 * Downloads covers → `assets/cover_*.jpg`, screenshots → `screenshots/01.jpg…`,
 * trailer → `assets/trailer.mp4` (the file names `scanContent` looks for by default).
 * Individual failures are reported in the result rather than thrown.
 */
export async function downloadSteamAssets(
  gameDir: string,
  appId: string,
  options: DownloadSteamAssetsOptions = {},
): Promise<SteamAssetsResult> {
  const { horizontal: wantHorizontal = true, vertical: wantVertical = true, trailer: wantTrailer = true, screenshots: wantScreenshots = true } =
    options;
  const data = await fetchAppData(appId, 'english');
  const assetsDir = path.join(gameDir, 'assets');
  const screenshotsDir = path.join(gameDir, 'screenshots');

  const screenshotUrls = wantScreenshots
    ? (data?.screenshots ?? [])
        .map((entry) => entry.path_full)
        .filter(isSteamCdnUrl)
        .slice(0, MAX_SCREENSHOTS)
    : [];

  const [horizontal, vertical, ...screenshots] = await Promise.all([
    wantHorizontal ? downloadFile(`${CDN_ROOT}/${appId}/library_hero.jpg`, path.join(assetsDir, 'cover_horizontal.jpg')) : false,
    wantVertical ? downloadFile(`${CDN_ROOT}/${appId}/library_600x900.jpg`, path.join(assetsDir, 'cover_vertical.jpg')) : false,
    ...screenshotUrls.map((url, index) =>
      downloadFile(url, path.join(screenshotsDir, `${String(index + 1).padStart(2, '0')}.jpg`)),
    ),
  ]);

  let trailer = false;
  const movieId = wantTrailer ? data?.movies?.[0]?.id : undefined;

  if (typeof movieId === 'number') {
    const trailerPath = path.join(assetsDir, 'trailer.mp4');

    for (const file of ['movie_max.mp4', 'movie480.mp4']) {
      trailer = await downloadFile(`${CDN_ROOT}/${movieId}/${file}`, trailerPath);

      if (trailer) {
        break;
      }
    }
  }

  return { covers: horizontal || vertical, screenshots: screenshots.filter(Boolean).length, trailer };
}

/** Call once, after `app` is ready. */
export function initSteam(): void {
  ipcMain.handle('steam:search', async (_event, term: unknown): Promise<SteamSearchResult[]> => {
    if (typeof term !== 'string' || !term.trim() || term.length > 100) {
      return [];
    }

    return searchSteam(term.trim());
  });

  ipcMain.handle('steam:info', async (_event, appId: unknown): Promise<SteamInfo | null> => {
    if (typeof appId !== 'string' || !STEAM_APP_ID_PATTERN.test(appId)) {
      return null;
    }

    return getSteamInfo(appId);
  });
}
