import * as fs from 'fs';
import * as path from 'path';

import { app, ipcMain, shell } from 'electron';

import { getContentDir, toFolderName } from './content';

const MANIFEST_TIMEOUT_MS = 15_000;

interface ShowcaseGameEntry {
  id: string;
  torrentMagnet: string;
}

interface ShowcaseManifest {
  version: number;
  games: ShowcaseGameEntry[];
}

type ShowcaseConfig = {
  name?: string;
  description?: { ru?: string | null; en?: string | null } | string;
  genre?: string;
  rating?: number;
  coverHorizontalPosition?: string;
  facts?: Array<{ label: { ru?: string | null; en?: string | null } | string; value: { ru?: string | null; en?: string | null } | string }>;
  screenshots?: string[];
  paths?: {
    coverHorizontal?: string;
    coverVertical?: string;
    trailer?: string;
  };
  torrentMagnet?: string;
};

export interface ShowcaseGame {
  id: string;
  name: string;
  rating: number | null;
  description: { ru: string | null; en: string | null } | null;
  genre: string | null;
  facts: Array<{ label: { ru: string | null; en: string | null }; value: { ru: string | null; en: string | null } }>;
  torrentMagnet: string;
  coverVertical: string | null;
  coverHorizontal: string | null;
  coverHorizontalPosition: 'top' | 'center' | 'bottom';
  screenshots: string[];
  trailer: string | null;
}

export interface ShowcaseData {
  games: ShowcaseGame[];
}

export type ShowcaseCheckResult =
  | { status: 'error' }
  | { status: 'available'; data: ShowcaseData };

const cachedShowcases = new Map<string, ShowcaseData>();

const isAllowedUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch {
    return false;
  }
};

const resolveUrl = (base: string, relative: string): string => {
  try {
    return new URL(relative, base).toString();
  } catch {
    return '';
  }
};

const localizeText = (value: { ru?: string | null; en?: string | null } | string | undefined | null): { ru: string | null; en: string | null } => {
  if (typeof value === 'string') {
    return { ru: value, en: value };
  }

  if (!value) {
    return { ru: null, en: null };
  }

  return {
    ru: value.ru ?? null,
    en: value.en ?? null,
  };
};

async function fetchShowcase(manifestUrl: string): Promise<ShowcaseCheckResult> {
  try {
    const response = await fetch(manifestUrl, {
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (!response.ok) {
      return { status: 'error' };
    }

    const manifest = (await response.json()) as ShowcaseManifest;

    if (!manifest || !Array.isArray(manifest.games)) {
      return { status: 'error' };
    }

    const games: ShowcaseGame[] = [];

    for (const entry of manifest.games) {
      if (!entry.id) {
        continue;
      }

      const configUrl = resolveUrl(manifestUrl, `${entry.id}/config.json`);

      let config: ShowcaseConfig | null = null;

      try {
        const configResponse = await fetch(configUrl, {
          signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
          cache: 'no-store',
        });

        if (configResponse.ok) {
          config = (await configResponse.json()) as ShowcaseConfig;
        }
      } catch {
        // config load failed
      }

      if (!config) {
        continue;
      }

      const description = config.description ? localizeText(config.description) : null;
      const facts = (config.facts || []).map((fact) => ({
        label: localizeText(fact.label),
        value: localizeText(fact.value),
      }));

      const coverPosition = config.coverHorizontalPosition;
      const position: 'top' | 'center' | 'bottom' =
        coverPosition === 'top' || coverPosition === 'bottom' ? coverPosition : 'center';

      const paths = config.paths || {};
      const coverHorizontalPath = paths.coverHorizontal || 'assets/cover_horizontal.jpg';
      const coverVerticalPath = paths.coverVertical || 'assets/cover_vertical.jpg';

      const game: ShowcaseGame = {
        id: entry.id,
        name: config.name || entry.id,
        genre: config.genre || null,
        rating: config.rating ?? null,
        description,
        facts,
        torrentMagnet: entry.torrentMagnet || '',
        coverVertical: resolveUrl(manifestUrl, `${entry.id}/${coverVerticalPath}`),
        coverHorizontal: resolveUrl(manifestUrl, `${entry.id}/${coverHorizontalPath}`),
        coverHorizontalPosition: position,
        screenshots: (config.screenshots || []).map((ss) => resolveUrl(manifestUrl, `${entry.id}/${ss}`)).filter(Boolean),
        trailer: paths.trailer ? resolveUrl(manifestUrl, `${entry.id}/${paths.trailer}`) : null,
      };

      games.push(game);
    }

    const data = { games };

    cachedShowcases.set(manifestUrl, data);

    return { status: 'available', data };
  } catch {
    return { status: 'error' };
  }
}

async function loadShowcase(url: string): Promise<ShowcaseCheckResult> {
  if (!url || !isAllowedUrl(url)) {
    return { status: 'error' };
  }

  const manifestUrl = url.endsWith('/manifest.json') ? url : `${url.replace(/\/$/, '')}/manifest.json`;

  return fetchShowcase(manifestUrl);
}

const APP_SUBFOLDERS = ['data', 'assets', 'installer', 'bonus', 'screenshots', 'backups'];

interface ImportShowcaseResult {
  ok: boolean;
  id?: string;
  error?: string;
  folderName?: string;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, buffer);
}

async function importShowcaseGame(gameId: string, overwrite: boolean): Promise<ImportShowcaseResult> {
  let game: ShowcaseGame | null = null;
  let manifestUrl: string | null = null;

  for (const [url, data] of cachedShowcases.entries()) {
    const found = data.games.find((g) => g.id === gameId);

    if (found) {
      game = found;
      manifestUrl = url;
      break;
    }
  }

  if (!game || !manifestUrl) {
    return { ok: false, error: 'Game not found in showcase' };
  }

  const folderName = toFolderName(game.name);

  if (!folderName) {
    return { ok: false, error: 'Invalid game name' };
  }

  const root = getContentDir();
  const dir = path.join(root, folderName);
  const exists = fs.existsSync(dir);

  if (exists && !overwrite) {
    return { ok: false, error: 'exists', folderName };
  }

  try {
    if (exists && overwrite) {
      // Remove everything except data/ and installer/
      const keepFolders = new Set(['data', 'installer']);
      const entries = await fs.promises.readdir(dir);

      for (const entry of entries) {
        if (keepFolders.has(entry)) continue;

        await fs.promises.rm(path.join(dir, entry), { recursive: true, force: true });
      }
    }

    await fs.promises.mkdir(root, { recursive: true });
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  try {
    for (const sub of APP_SUBFOLDERS) {
      const subPath = path.join(dir, sub);

      if (!fs.existsSync(subPath)) {
        await fs.promises.mkdir(subPath);
      }
    }

    const config: ShowcaseConfig = {
      name: game.name,
      genre: game.genre || undefined,
      rating: game.rating ?? undefined,
      description: game.description
        ? { ru: game.description.ru ?? undefined, en: game.description.en ?? undefined }
        : undefined,
      facts: game.facts.map((fact) => ({
        label: { ru: fact.label.ru ?? undefined, en: fact.label.en ?? undefined },
        value: { ru: fact.value.ru ?? undefined, en: fact.value.en ?? undefined },
      })),
      coverHorizontalPosition: game.coverHorizontalPosition !== 'center' ? game.coverHorizontalPosition : undefined,
      torrentMagnet: game.torrentMagnet || undefined,
    };

    await fs.promises.writeFile(path.join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n', 'utf-8');

    const downloadTasks: Promise<void>[] = [];

    if (game.coverHorizontal) {
      downloadTasks.push(downloadFile(game.coverHorizontal, path.join(dir, 'assets', 'cover_horizontal.jpg')));
    }

    if (game.coverVertical) {
      downloadTasks.push(downloadFile(game.coverVertical, path.join(dir, 'assets', 'cover_vertical.jpg')));
    }

    if (game.trailer) {
      downloadTasks.push(downloadFile(game.trailer, path.join(dir, 'assets', 'trailer.mp4')));
    }

    for (let i = 0; i < game.screenshots.length; i++) {
      downloadTasks.push(downloadFile(game.screenshots[i], path.join(dir, 'screenshots', `${i + 1}.jpg`)));
    }

    await Promise.allSettled(downloadTasks);

    return { ok: true, id: folderName };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function initShowcase(): void {
  ipcMain.handle('showcase:load', (_event, url: unknown): Promise<ShowcaseCheckResult> => {
    if (typeof url !== 'string') {
      return Promise.resolve({ status: 'error' });
    }

    return loadShowcase(url);
  });
  ipcMain.handle('showcase:import', (_event, gameId: unknown, overwrite: unknown): Promise<ImportShowcaseResult> => {
    if (typeof gameId !== 'string') {
      return Promise.resolve({ ok: false, error: 'Invalid game id' });
    }

    return importShowcaseGame(gameId, Boolean(overwrite));
  });
  ipcMain.handle('showcase:open-folder', (_event, folderName: unknown): Promise<{ ok: boolean; error?: string }> => {
    if (typeof folderName !== 'string') {
      return Promise.resolve({ ok: false, error: 'Invalid folder name' });
    }

    const root = getContentDir();
    const dir = path.join(root, folderName);

    if (!fs.existsSync(dir)) {
      return Promise.resolve({ ok: false, error: 'Folder not found' });
    }

    return shell.openPath(dir).then((error) => {
      if (error) {
        return { ok: false, error };
      }

      return { ok: true };
    });
  });
}
