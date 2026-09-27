import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron';

import { contentDirEnvName } from './appInfo';
import {
  backupsDirOf,
  createBackup,
  listBackups,
  resolveBackup,
  restoreBackup,
  type BackupResult,
} from './backups';
import {
  getRunningIds,
  launchExecutable,
  NO_LAUNCH_OPTIONS,
  splitArgs,
  stopGame,
  type LaunchOptions,
  type LaunchResult,
} from './launch';
import { emitLauncherAction, type LauncherAction } from './launcherActions';
import { expandPathTokens, toPortablePath } from './savePaths';
import { downloadSteamAssets, STEAM_APP_ID_PATTERN, type DownloadSteamAssetsOptions, type SteamAssetsResult } from './steam';

/**
 * Content library: `<contentDir>` holds one folder per application.
 *   <contentDir>/<AppName>/
 *     config.json   (optional — overrides the conventions below)
 *     data/         application files, incl. the executable
 *     assets/       cover images (cover_horizontal.jpg, cover_vertical.jpg)
 *
 * Covers are served to the renderer through the custom `content://` protocol
 * so that arbitrary on-disk files can be shown in <img> without disabling
 * webSecurity. Executables are launched from the main process only.
 */

const SCHEME = 'content';

// Must run before `app` is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

/** `{ ru, en }` in config.json; a bare string is treated as `en`. */
interface LocalizedText {
  ru: string | null;
  en: string | null;
}

/** A fact row on the app page — a localized label (e.g. "Release year") and localized value. */
interface AppFact {
  label: LocalizedText;
  value: LocalizedText;
}

/** Severity of a `previewNotes` message; drives the icon/color in the renderer's `Message` component. */
type PreviewNoteType = 'info' | 'success' | 'warning' | 'error';

interface AppConfig {
  name?: string;
  description?: unknown;
  /** Compatibility fixes / setup notes, shown in an in-app popup instead of a README.txt file. */
  instructions?: unknown;
  /** 0-10 critic score (e.g. Metacritic / 10). */
  rating?: number;
  /** Where the trailer preview on a gallery card starts, as a percentage (0-100) of the trailer's length. */
  previewStart?: number;
  /** i18n key (e.g. "genre.action") the renderer resolves — used for grouping/filtering. */
  genre?: string;
  /** Franchise/series name, shown as-is (not localized). Omit for standalone games. */
  series?: string;
  /** CSS `object-position` keyword for the hero image; defaults to `center`. */
  coverHorizontalPosition?: string;
  facts?: Array<{ label?: unknown; value?: unknown }>;
  /**
   * Notes shown under the actions row on the app page (e.g. a compatibility
   * warning), stacked in array order. A bare object (pre-array config format)
   * is also accepted and treated as a single-item list.
   */
  previewNotes?: Array<{ text?: unknown; type?: unknown }> | { text?: unknown; type?: unknown };
  /** How the game is started; all optional. */
  launch?: {
    /** Command-line arguments, e.g. `-windowed -nointro`. */
    args?: unknown;
  };
  /** Every on-disk path a game can point at, relative to its own folder. */
  paths?: {
    exec?: string;
    /** External config/tweak tool some games ship (e.g. a "Setup.exe" graphics config). */
    settings?: string;
    /** Installer executable. If omitted, the `installer/` folder (if present) is opened instead of running a file. */
    installer?: string;
    coverHorizontal?: string;
    coverVertical?: string;
    /** Bonus content folder (concept art, soundtrack, …); defaults to `bonus`. */
    bonus?: string;
    /** Screenshots folder; defaults to `screenshots`. */
    screenshots?: string;
    /** Trailer video file; defaults to `assets/trailer.mp4`. */
    trailer?: string;
    /** Saves folder/file to back up. May be absolute or use `%DOCUMENTS%`, `%APPDATA%`, …; relative paths start at the game folder. */
    saves?: string;
  };
}

type CoverPosition = 'top' | 'center' | 'bottom';

interface PreviewNote {
  text: LocalizedText;
  type: PreviewNoteType;
}

interface ScannedApp {
  id: string;
  name: string;
  description: LocalizedText | null;
  instructions: LocalizedText | null;
  rating: number | null;
  previewStart: number | null;
  genre: string | null;
  series: string | null;
  coverHorizontalPosition: CoverPosition;
  facts: AppFact[];
  previewNotes: PreviewNote[];
  dir: string;
  execAbs: string | null;
  settingsAbs: string | null;
  /** Installer executable from `paths.installer`, if configured and it resolves to a file. */
  installerFileAbs: string | null;
  installerDirAbs: string | null;
  dataDirAbs: string | null;
  /** Bonus content target from `paths.bonus` — may be a file or a folder. */
  bonusAbs: string | null;
  coverHorizontalAbs: string | null;
  coverVerticalAbs: string | null;
  trailerAbs: string | null;
  screenshotsAbs: string[];
  /** Saves path from `paths.saves` after token expansion (may not exist yet). */
  savesAbs: string | null;
  launch: LaunchOptions;
  /** Folder creation time, ms since epoch. */
  addedAt: number | null;
}

/** Shape sent to the renderer (never exposes absolute disk paths). */
interface ContentAppMeta {
  id: string;
  name: string;
  description: LocalizedText | null;
  instructions: LocalizedText | null;
  rating: number | null;
  previewStart: number | null;
  genre: string | null;
  series: string | null;
  coverHorizontalPosition: CoverPosition;
  facts: AppFact[];
  previewNotes: PreviewNote[];
  coverHorizontal: string | null;
  coverVertical: string | null;
  hasExec: boolean;
  hasSettings: boolean;
  hasInstaller: boolean;
  hasDataFiles: boolean;
  hasBonusContent: boolean;
  /** `content://` URLs of the screenshots, in file-name order. */
  screenshots: string[];
  /** `content://` URL of the trailer video, or `null`. */
  trailer: string | null;
  /** Whether `paths.saves` is configured (the folder itself may not exist yet). */
  hasSaves: boolean;
  /** When the game folder was created, ms since epoch. */
  addedAt: number | null;
}

/** Clamp to [0, 10] and round to one decimal; anything else is unrated. */
function readRating(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(Math.min(10, Math.max(0, value)) * 10) / 10;
}

/** Clamp to [0, 100] and round; anything else means "not set". */
function readPercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

function readLocalizedText(value: unknown): LocalizedText | null {
  const clean = (input: unknown): string | null =>
    typeof input === 'string' && input.trim() ? input.trim() : null;

  if (typeof value === 'string') {
    const en = clean(value);

    return en ? { ru: null, en } : null;
  }
  if (value && typeof value === 'object') {
    const obj = value as { ru?: unknown; en?: unknown };
    const ru = clean(obj.ru);
    const en = clean(obj.en);

    return ru || en ? { ru, en } : null;
  }

  return null;
}

/** Trim a config string field; `""`/missing/wrong type all read as `null`. */
function readPlainString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Anything but a recognized keyword falls back to `center`. */
function readCoverPosition(value: unknown): CoverPosition {
  return value === 'top' || value === 'bottom' ? value : 'center';
}

function readFacts(value: AppConfig['facts']): AppFact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const label = readLocalizedText(entry?.label);
    const factValue = readLocalizedText(entry?.value);

    return label && factValue ? [{ label, value: factValue }] : [];
  });
}

function readLaunchOptions(value: AppConfig['launch']): LaunchOptions {
  return {
    args: typeof value?.args === 'string' ? splitArgs(value.args) : [],
  };
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const MAX_SCREENSHOTS = 40;

/** Image files of a screenshots folder in natural file-name order (`2.jpg` before `10.jpg`). */
function listScreenshots(folder: string | null): string[] {
  if (!folder) {
    return [];
  }
  try {
    return fs
      .readdirSync(folder)
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .slice(0, MAX_SCREENSHOTS)
      .map((name) => path.join(folder, name));
  } catch {
    return [];
  }
}

/** `paths.saves`: tokens like `%DOCUMENTS%` are expanded; a relative path starts at the game folder. */
function resolveSavesPath(dir: string, value: string | undefined): string | null {
  const trimmed = readPlainString(value);
  if (!trimmed) {
    return null;
  }
  const expanded = expandPathTokens(trimmed);

  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(dir, expanded);
}

function readAddedAt(dir: string): number | null {
  try {
    return Math.round(fs.statSync(dir).birthtimeMs);
  } catch {
    return null;
  }
}

const PREVIEW_NOTE_TYPES: PreviewNoteType[] = ['info', 'success', 'warning', 'error'];

function readPreviewNoteType(value: unknown): PreviewNoteType {
  return PREVIEW_NOTE_TYPES.includes(value as PreviewNoteType) ? (value as PreviewNoteType) : 'info';
}

/** Reads one `{ text, type }` entry; `null` if `text` is empty/missing. */
function readPreviewNote(value: { text?: unknown; type?: unknown } | undefined): PreviewNote | null {
  const text = readLocalizedText(value?.text);

  return text ? { text, type: readPreviewNoteType(value?.type) } : null;
}

/** Accepts an array (current format) or a bare object (pre-array config). */
function readPreviewNotes(value: AppConfig['previewNotes']): PreviewNote[] {
  const entries = Array.isArray(value) ? value : value ? [value] : [];

  return entries.flatMap((entry) => {
    const note = readPreviewNote(entry);

    return note ? [note] : [];
  });
}

interface ContentLibrary {
  dir: string;
  apps: ContentAppMeta[];
}

/** Total and free space on the volume the content folder lives on. */
interface DiskSpace {
  total: number;
  free: number;
}

/** Bytes on disk per part of a game folder; `null` where that part is absent. */
interface AppSizes {
  installer: number | null;
  data: number | null;
  trailer: number | null;
  covers: number | null;
  bonus: number | null;
}

interface CreateAppResult {
  ok: boolean;
  /** Folder name of the new app (its stable id). Present only when `ok`. */
  id?: string;
  error?: string;
}

interface ConfigResult {
  ok: boolean;
  config?: AppConfig;
  error?: string;
}

/** Which `paths.*` field a native picker dialog is filling in — decides file-vs-folder and file filters. */
type PathField =
  | 'exec'
  | 'settings'
  | 'installer'
  | 'coverHorizontal'
  | 'coverVertical'
  | 'bonus'
  | 'screenshots'
  | 'trailer'
  | 'saves';

interface PickPathResult {
  ok: boolean;
  /** Path relative to the app's own folder, `/`-separated. Present only when `ok`. */
  path?: string;
  error?: string;
}

/** Sub-folders created for every new app — the conventions `scanContent` falls back to. */
const APP_SUBFOLDERS = ['data', 'assets', 'installer', 'bonus', 'screenshots'];

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/** Turns a game title into a folder name that is valid on Windows; `null` if nothing usable is left. */
function toFolderName(title: string): string | null {
  const cleaned = title
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*%\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 100)
    .trim();

  return cleaned && !WINDOWS_RESERVED_NAMES.test(cleaned) ? cleaned : null;
}

let contentDirCache: string | null = null;

/**
 * Locate the `content/` directory. It is deliberately NOT bundled into the
 * package (it can be gigabytes and swappable), so we look for it next to
 * whatever the user actually launched — which differs per build type:
 *   - `npm start` (dev):        <projectRoot>/dist/content
 *   - dist/win-unpacked/*.exe:  ../content  (sibling of win-unpacked)
 *   - portable *.exe:           <dir of the portable exe>/content
 *   - NSIS-installed *.exe:     <install dir>/content
 * `<PACKAGE_NAME>_CONTENT_DIR` (see `contentDirEnvName`) overrides everything.
 */
function contentDirCandidates(): string[] {
  const exeDir = path.dirname(app.getPath('exe'));
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;

  return [
    process.env[contentDirEnvName()],
    portableDir ? path.join(portableDir, 'content') : null,
    app.isPackaged ? path.join(exeDir, 'content') : null,
    app.isPackaged ? path.join(exeDir, '..', 'content') : null,
    app.isPackaged ? path.join(process.resourcesPath, 'content') : null,
    app.isPackaged ? null : path.join(app.getAppPath(), 'dist', 'content'),
    path.join(process.cwd(), 'content'),
  ]
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => path.resolve(entry));
}

function getContentDir(): string {
  if (contentDirCache) {
    return contentDirCache;
  }

  const candidates = contentDirCandidates();
  const existing = candidates.find((entry) => fs.existsSync(entry));
  contentDirCache = existing ?? candidates[0];

  if (existing) {
    console.log('[content] content dir:', contentDirCache);
  } else {
    console.warn('[content] content dir not found. Looked in:\n  ' + candidates.join('\n  '));
  }

  return contentDirCache;
}

async function readConfig(dir: string): Promise<AppConfig> {
  try {
    const raw = await fs.promises.readFile(path.join(dir, 'config.json'), 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    return parsed && typeof parsed === 'object' ? (parsed as AppConfig) : {};
  } catch {
    return {};
  }
}

/** Resolve a config-relative path, but only if it stays inside `dir` and exists. */
function resolveInside(dir: string, relative: string): string | null {
  const abs = path.resolve(dir, relative);
  if (abs !== dir && !abs.startsWith(dir + path.sep)) {
    return null;
  }

  return fs.existsSync(abs) ? abs : null;
}

/** Like `resolveInside`, but only returns the path if it is an existing directory. */
function resolveDirInside(dir: string, relative: string): string | null {
  const abs = resolveInside(dir, relative);
  try {
    return abs && fs.statSync(abs).isDirectory() ? abs : null;
  } catch {
    return null;
  }
}

/** Like `resolveDirInside`, but only returns the path if the directory is non-empty. */
function resolveNonEmptyDirInside(dir: string, relative: string): string | null {
  const abs = resolveDirInside(dir, relative);
  try {
    return abs && fs.readdirSync(abs).length > 0 ? abs : null;
  } catch {
    return null;
  }
}

/** Caps how many `lstat`/`readdir` calls are in flight at once, process-wide. A huge `data/` folder
 * recursed with plain `Promise.all` kicks off one of these per file/subfolder *immediately* — for a
 * deep tree that's easily tens of thousands at once, which floods the OS (file-handle limits, disk
 * queue depth) and can make the whole scan appear to hang on one folder. The recursion itself stays
 * unbounded (cheap, just pending promises); only the actual syscalls are throttled. */
const MAX_CONCURRENT_FS_OPS = 32;
let activeFsOps = 0;
const fsOpQueue: Array<() => void> = [];

function runLimited<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeFsOps++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          activeFsOps--;
          fsOpQueue.shift()?.();
        });
    };

    if (activeFsOps < MAX_CONCURRENT_FS_OPS) {
      run();
    } else {
      fsOpQueue.push(run);
    }
  });
}

/** Lets a size scan be abandoned early (tab switched away) without waiting for whatever huge folder
 * it happens to be walking right now. */
interface ScanSignal {
  cancelled: boolean;
}

/** The signal for whatever `content:sizes` scan is running right now, if any — so a cancel request
 * (the renderer leaving the health tab mid-scan) can reach it without an id round-trip. */
let activeSizeScan: ScanSignal | null = null;

/** Total size of a file, or of everything under a folder. Symlinks aren't followed; unreadable entries
 * count as 0. Checks `signal` before doing any work, so a cancelled scan unwinds almost immediately
 * instead of finishing the folder it was in the middle of. */
async function pathSize(target: string, signal: ScanSignal): Promise<number> {
  if (signal.cancelled) {
    return 0;
  }

  try {
    const stat = await runLimited(() => fs.promises.lstat(target));
    if (!stat.isDirectory()) {
      return stat.size;
    }
    if (signal.cancelled) {
      return 0;
    }
    const names = await runLimited(() => fs.promises.readdir(target));
    const sizes = await Promise.all(names.map((name) => pathSize(path.join(target, name), signal)));

    return sizes.reduce((sum, size) => sum + size, 0);
  } catch {
    return 0;
  }
}

async function optionalPathSize(target: string | null, signal: ScanSignal): Promise<number | null> {
  return target ? pathSize(target, signal) : null;
}

async function measureApp(appEntry: ScannedApp, signal: ScanSignal): Promise<AppSizes> {
  const covers = [appEntry.coverHorizontalAbs, appEntry.coverVerticalAbs].filter(
    (cover): cover is string => cover != null,
  );
  const coverSizes = await Promise.all(covers.map((cover) => pathSize(cover, signal)));

  return {
    installer: await optionalPathSize(appEntry.installerDirAbs ?? appEntry.installerFileAbs, signal),
    data: await optionalPathSize(appEntry.dataDirAbs, signal),
    trailer: await optionalPathSize(appEntry.trailerAbs, signal),
    covers: covers.length > 0 ? coverSizes.reduce((sum, size) => sum + size, 0) : null,
    bonus: await optionalPathSize(appEntry.bonusAbs, signal),
  };
}

async function scanContent(): Promise<ScannedApp[]> {
  const root = getContentDir();

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const apps: ScannedApp[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const id = entry.name;
    const dir = path.join(root, id);
    const config = await readConfig(dir);
    const name = typeof config.name === 'string' && config.name.trim() ? config.name.trim() : id;

    apps.push({
      id,
      name,
      description: readLocalizedText(config.description),
      instructions: readLocalizedText(config.instructions),
      rating: readRating(config.rating),
      previewStart: readPercent(config.previewStart),
      genre: readPlainString(config.genre),
      series: readPlainString(config.series),
      coverHorizontalPosition: readCoverPosition(config.coverHorizontalPosition),
      facts: readFacts(config.facts),
      previewNotes: readPreviewNotes(config.previewNotes),
      dir,
      execAbs: resolveInside(dir, config.paths?.exec ?? `data/${id}.exe`),
      settingsAbs: config.paths?.settings ? resolveInside(dir, config.paths.settings) : null,
      installerFileAbs: config.paths?.installer ? resolveInside(dir, config.paths.installer) : null,
      installerDirAbs: resolveDirInside(dir, 'installer'),
      dataDirAbs: resolveNonEmptyDirInside(dir, 'data'),
      // An explicit `paths.bonus` may be a file or a folder (like exec/settings/installer);
      // the unconfigured default only guesses a folder, and only if it actually has content.
      bonusAbs: config.paths?.bonus
        ? resolveInside(dir, config.paths.bonus)
        : resolveNonEmptyDirInside(dir, 'bonus'),
      coverHorizontalAbs: resolveInside(dir, config.paths?.coverHorizontal ?? 'assets/cover_horizontal.jpg'),
      coverVerticalAbs: resolveInside(dir, config.paths?.coverVertical ?? 'assets/cover_vertical.jpg'),
      trailerAbs: resolveInside(dir, config.paths?.trailer ?? 'assets/trailer.mp4'),
      screenshotsAbs: listScreenshots(resolveDirInside(dir, config.paths?.screenshots ?? 'screenshots')),
      savesAbs: resolveSavesPath(dir, config.paths?.saves),
      launch: readLaunchOptions(config.launch),
      addedAt: readAddedAt(dir),
    });
  }

  // Highest rated first; unrated apps sink to the end. Ties broken by name.
  apps.sort((a, b) => {
    if (a.rating !== b.rating) {
      if (a.rating == null) {
        return 1;
      }
      if (b.rating == null) {
        return -1;
      }

      return b.rating - a.rating;
    }

    return a.name.localeCompare(b.name);
  });

  return apps;
}

function toContentUrl(absPath: string): string {
  const rel = path
    .relative(getContentDir(), absPath)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/');

  return `${SCHEME}://local/${rel}`;
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m4v': 'video/mp4',
};

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.m4v']);

/** Streams a video with HTTP Range support, which `<video>` needs for seeking. */
async function serveVideo(abs: string, mime: string, rangeHeader: string | null): Promise<Response> {
  const { size } = await fs.promises.stat(abs);
  const match = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader) : null;
  const toBody = (stream: fs.ReadStream) => Readable.toWeb(stream) as unknown as ReadableStream;

  if (!match) {
    return new Response(toBody(fs.createReadStream(abs)), {
      headers: { 'Content-Type': mime, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' },
    });
  }

  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

  if (start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }

  return new Response(toBody(fs.createReadStream(abs, { start, end })), {
    status: 206,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

function registerProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const { pathname } = new URL(request.url);
      const rel = pathname
        .replace(/^\/+/, '')
        .split('/')
        .map(decodeURIComponent)
        .join(path.sep);
      const root = getContentDir();
      const abs = path.resolve(root, rel);

      if (abs !== root && !abs.startsWith(root + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }

      const extension = path.extname(abs).toLowerCase();
      const mime = MIME_BY_EXT[extension] ?? 'application/octet-stream';

      if (VIDEO_EXTENSIONS.has(extension)) {
        return serveVideo(abs, mime, request.headers.get('range'));
      }

      const data = await fs.promises.readFile(abs);

      return new Response(data, { headers: { 'Content-Type': mime } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

/**
 * Launch a `paths.*` target that may resolve to a folder, a `.lnk` shortcut,
 * or a plain executable — each needs a different open strategy:
 *   - a folder is opened in the OS file manager, not "run";
 *   - a shortcut is resolved and launched through the shell (`spawn` can't
 *     execute `.lnk` files directly — Explorer's shell layer does that);
 *   - anything else falls back to `launchExecutable`'s direct spawn.
 */
/** Tells the progress tracker about a user action, but only once it has really succeeded. */
async function announceIfOk(action: LauncherAction, result: Promise<LaunchResult>): Promise<LaunchResult> {
  try {
    const resolved = await result;

    if (resolved.ok) {
      emitLauncherAction(action);
    }

    return resolved;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function launchPath(
  target: string,
  options: LaunchOptions = NO_LAUNCH_OPTIONS,
  trackAs?: string,
): Promise<LaunchResult> {
  let isDirectory = false;
  try {
    isDirectory = (await fs.promises.stat(target)).isDirectory();
  } catch {
    // fall through — resolveInside already guarantees the path exists
  }

  if (isDirectory || path.extname(target).toLowerCase() === '.lnk') {
    const error = await shell.openPath(target);

    return error ? { ok: false, error } : { ok: true };
  }

  return launchExecutable(target, options, trackAs);
}

function registerIpc(): void {
  ipcMain.handle('content:list', async (): Promise<ContentLibrary> => {
    const apps = await scanContent();

    return {
      dir: getContentDir(),
      apps: apps.map((appEntry) => ({
        id: appEntry.id,
        name: appEntry.name,
        description: appEntry.description,
        instructions: appEntry.instructions,
        rating: appEntry.rating,
        previewStart: appEntry.previewStart,
        genre: appEntry.genre,
        series: appEntry.series,
        coverHorizontalPosition: appEntry.coverHorizontalPosition,
        facts: appEntry.facts,
        previewNotes: appEntry.previewNotes,
        coverHorizontal: appEntry.coverHorizontalAbs
          ? toContentUrl(appEntry.coverHorizontalAbs)
          : null,
        coverVertical: appEntry.coverVerticalAbs ? toContentUrl(appEntry.coverVerticalAbs) : null,
        hasExec: appEntry.execAbs != null,
        hasSettings: appEntry.settingsAbs != null,
        hasInstaller: appEntry.installerFileAbs != null || appEntry.installerDirAbs != null,
        hasDataFiles: appEntry.dataDirAbs != null,
        hasBonusContent: appEntry.bonusAbs != null,
        screenshots: appEntry.screenshotsAbs.map(toContentUrl),
        trailer: appEntry.trailerAbs ? toContentUrl(appEntry.trailerAbs) : null,
        hasSaves: appEntry.savesAbs != null,
        addedAt: appEntry.addedAt,
      })),
    };
  });

  ipcMain.handle('content:disk-space', async (): Promise<DiskSpace | null> => {
    // A single OS call for the volume's own bookkeeping (Windows' `GetDiskFreeSpaceEx` under the hood) —
    // unlike `content:sizes`, this never touches the folder tree, so it's effectively instant regardless
    // of how much is on the drive.
    try {
      const stat = await fs.promises.statfs(getContentDir());

      return { total: stat.blocks * stat.bsize, free: stat.bavail * stat.bsize };
    } catch (err) {
      console.error('[content] disk space check failed:', err);

      return null;
    }
  });

  ipcMain.handle('content:sizes', async (event, skipIdsRaw: unknown): Promise<Record<string, AppSizes>> => {
    // Ids the caller already has results for (measured in an earlier, since-cancelled call) — skipped
    // so re-opening the health tab resumes instead of re-walking games it already sized.
    const skipIds = new Set(Array.isArray(skipIdsRaw) ? skipIdsRaw.filter((id): id is string => typeof id === 'string') : []);
    const allApps = await scanContent();
    const pending = allApps.filter((appEntry) => !skipIds.has(appEntry.id));
    const signal: ScanSignal = { cancelled: false };
    activeSizeScan = signal;

    const sizes: Record<string, AppSizes> = {};

    // One game at a time — a big `data/` tree already fans out plenty of parallel disk reads on its own.
    for (const appEntry of pending) {
      if (signal.cancelled) {
        break;
      }
      const measured = await measureApp(appEntry, signal);
      if (signal.cancelled) {
        // Cancelled mid-measurement — `measured` is an incomplete, zeroed-out read, not a real result.
        break;
      }
      sizes[appEntry.id] = measured;
      event.sender.send('content:sizes-progress', { id: appEntry.id, sizes: measured });
    }

    if (activeSizeScan === signal) {
      activeSizeScan = null;
    }

    // Ran to completion (not cancelled), and every game the scan started with now has a result (this
    // batch plus whatever the caller already knew) — the whole library's disk usage is accounted for.
    if (!signal.cancelled && allApps.length > 0) {
      emitLauncherAction('disk-scan-completed');
    }

    return sizes;
  });

  ipcMain.on('content:sizes-cancel', () => {
    if (activeSizeScan) {
      activeSizeScan.cancelled = true;
    }
  });

  ipcMain.handle('content:open-installer', async (_event, appId: unknown): Promise<LaunchResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }
    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (target?.installerFileAbs) {
      return announceIfOk('installer-opened', launchPath(target.installerFileAbs));
    }
    if (!target?.installerDirAbs) {
      return { ok: false, error: 'Папка installer не найдена' };
    }
    const error = await shell.openPath(target.installerDirAbs);
    if (!error) {
      emitLauncherAction('installer-opened');
    }

    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('content:open-data', async (_event, appId: unknown): Promise<LaunchResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }
    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (!target?.dataDirAbs) {
      return { ok: false, error: 'Папка data не найдена' };
    }
    const error = await shell.openPath(target.dataDirAbs);

    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('content:open-app-folder', async (_event, appId: unknown): Promise<LaunchResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }
    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (!target) {
      return { ok: false, error: 'Игра не найдена' };
    }
    const error = await shell.openPath(target.dir);

    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('content:open-bonus', async (_event, appId: unknown): Promise<LaunchResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }
    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (!target?.bonusAbs) {
      return { ok: false, error: 'Доп. контент не найден' };
    }
    // shell.openPath handles both cases: a folder opens in the file manager, a file opens with its default app.
    const error = await shell.openPath(target.bonusAbs);
    if (!error) {
      emitLauncherAction('bonus-opened');
    }

    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('content:launch', async (_event, appId: unknown): Promise<LaunchResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }

    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (!target) {
      return { ok: false, error: 'Игра не найдена' };
    }
    if (!target.execAbs) {
      return { ok: false, error: 'Не найден исполняемый файл' };
    }

    return launchPath(target.execAbs, target.launch, target.id);
  });

  ipcMain.handle('content:stop', async (_event, appId: unknown): Promise<LaunchResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }

    return announceIfOk('game-stopped', stopGame(appId));
  });

  ipcMain.handle('content:running', (): string[] => getRunningIds());

  ipcMain.handle(
    'content:create-app',
    async (_event, title: unknown, config: unknown): Promise<CreateAppResult> => {
      if (typeof title !== 'string') {
        return { ok: false, error: 'Некорректное название игры' };
      }
      const folderName = toFolderName(title);
      if (!folderName) {
        return { ok: false, error: 'Из названия нельзя получить имя папки — уберите служебные символы' };
      }

      const root = getContentDir();
      const dir = path.join(root, folderName);

      try {
        await fs.promises.mkdir(root, { recursive: true });
        await fs.promises.mkdir(dir);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
          return { ok: false, error: `Папка «${folderName}» уже существует — выберите другое название` };
        }

        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }

      try {
        await Promise.all(APP_SUBFOLDERS.map((sub) => fs.promises.mkdir(path.join(dir, sub))));
        await fs.promises.writeFile(
          path.join(dir, 'config.json'),
          JSON.stringify(config && typeof config === 'object' ? config : { name: title }, null, 2) + '\n',
          'utf-8',
        );

        return { ok: true, id: folderName };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  ipcMain.handle(
    'content:download-steam-assets',
    async (_event, appId: unknown, steamAppId: unknown, options: unknown): Promise<SteamAssetsResult | null> => {
      if (typeof appId !== 'string' || typeof steamAppId !== 'string' || !STEAM_APP_ID_PATTERN.test(steamAppId)) {
        return null;
      }
      const target = (await scanContent()).find((appEntry) => appEntry.id === appId);

      if (!target) {
        return null;
      }

      const raw = options && typeof options === 'object' ? (options as Record<string, unknown>) : {};
      const flag = (name: keyof DownloadSteamAssetsOptions): boolean | undefined =>
        typeof raw[name] === 'boolean' ? (raw[name] as boolean) : undefined;
      const safeOptions: DownloadSteamAssetsOptions = {
        horizontal: flag('horizontal'),
        vertical: flag('vertical'),
        trailer: flag('trailer'),
        screenshots: flag('screenshots'),
      };

      return downloadSteamAssets(target.dir, steamAppId, safeOptions);
    },
  );

  ipcMain.handle('content:read-config', async (_event, appId: unknown): Promise<ConfigResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }
    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (!target) {
      return { ok: false, error: 'Игра не найдена' };
    }

    return { ok: true, config: await readConfig(target.dir) };
  });

  ipcMain.handle(
    'content:write-config',
    async (_event, appId: unknown, config: unknown): Promise<LaunchResult> => {
      if (typeof appId !== 'string') {
        return { ok: false, error: 'Некорректный идентификатор приложения' };
      }
      if (!config || typeof config !== 'object') {
        return { ok: false, error: 'Некорректные данные конфига' };
      }
      const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
      if (!target) {
        return { ok: false, error: 'Игра не найдена' };
      }
      try {
        await fs.promises.writeFile(
          path.join(target.dir, 'config.json'),
          JSON.stringify(config, null, 2) + '\n',
          'utf-8',
        );
        emitLauncherAction('config-saved');

        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  const IMAGE_FIELDS = new Set<PathField>(['coverHorizontal', 'coverVertical']);
  const EXECUTABLE_FIELDS = new Set<PathField>(['exec', 'settings', 'installer']);
  // Windows can't show one dialog offering both files and folders (it silently
  // degrades to a folder-only, icon-less picker), so these fields get separate
  // "browse file" / "browse folder" dialogs instead, picked via `mode`.
  const DUAL_MODE_FIELDS = new Set<PathField>(['exec', 'settings', 'installer', 'bonus', 'saves']);
  const FOLDER_ONLY_FIELDS = new Set<PathField>(['screenshots']);
  const VIDEO_FIELDS = new Set<PathField>(['trailer']);

  ipcMain.handle(
    'content:pick-path',
    async (_event, appId: unknown, field: unknown, mode: unknown): Promise<PickPathResult> => {
      if (typeof appId !== 'string' || typeof field !== 'string') {
        return { ok: false, error: 'Некорректные параметры' };
      }
      const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
      if (!target) {
        return { ok: false, error: 'Игра не найдена' };
      }

      const pathField = field as PathField;
      const wantsFolder =
        FOLDER_ONLY_FIELDS.has(pathField) || (mode === 'folder' && DUAL_MODE_FIELDS.has(pathField));

      const filters = wantsFolder
        ? []
        : IMAGE_FIELDS.has(pathField)
          ? [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'] }]
          : VIDEO_FIELDS.has(pathField)
            ? [{ name: 'Video', extensions: ['mp4', 'webm', 'm4v'] }]
            : EXECUTABLE_FIELDS.has(pathField)
            ? [
                { name: 'Executables & shortcuts', extensions: ['exe', 'lnk'] },
                { name: 'All files', extensions: ['*'] },
              ]
            : [];

      const options = {
        defaultPath: target.dir,
        properties: [wantsFolder ? ('openDirectory' as const) : ('openFile' as const)],
        filters,
      };
      const focused = BrowserWindow.getFocusedWindow();
      const result = focused
        ? await dialog.showOpenDialog(focused, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return { ok: false };
      }

      // Saves usually live outside the game folder (Documents, AppData), so they're stored
      // as portable paths (`%DOCUMENTS%/…`) unless they happen to be inside the game folder.
      const picked = result.filePaths[0];
      const relative = path.relative(target.dir, picked);
      const isInside = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
      const stored = pathField === 'saves' && !isInside ? toPortablePath(picked) : relative.split(path.sep).join('/');

      return { ok: true, path: stored };
    },
  );

  ipcMain.handle('content:folder-name', (_event, title: unknown): string | null =>
    typeof title === 'string' ? toFolderName(title) : null,
  );

  const withSavesTarget = async (
    appId: unknown,
  ): Promise<{ target: ScannedApp; savesAbs: string } | { error: string }> => {
    if (typeof appId !== 'string') {
      return { error: 'Некорректный идентификатор приложения' };
    }
    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (!target) {
      return { error: 'Игра не найдена' };
    }
    if (!target.savesAbs) {
      return { error: 'Путь к сохранениям не задан в настройках игры' };
    }

    return { target, savesAbs: target.savesAbs };
  };

  const backupResult = async (target: ScannedApp): Promise<BackupResult> => ({
    ok: true,
    backups: await listBackups(target.dir),
  });

  const failure = (err: unknown): BackupResult => ({
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  });

  ipcMain.handle('content:backup-list', async (_event, appId: unknown): Promise<BackupResult> => {
    const found = await withSavesTarget(appId);

    return 'error' in found ? { ok: false, error: found.error } : backupResult(found.target);
  });

  ipcMain.handle('content:backup-create', async (_event, appId: unknown): Promise<BackupResult> => {
    const found = await withSavesTarget(appId);
    if ('error' in found) {
      return { ok: false, error: found.error };
    }
    if (!fs.existsSync(found.savesAbs)) {
      return { ok: false, error: `Папка сохранений не найдена: ${found.savesAbs}` };
    }
    try {
      await createBackup(found.target.dir, found.savesAbs);
      emitLauncherAction('backup-created');

      return await backupResult(found.target);
    } catch (err) {
      return failure(err);
    }
  });

  ipcMain.handle(
    'content:backup-restore',
    async (_event, appId: unknown, name: unknown): Promise<BackupResult> => {
      const found = await withSavesTarget(appId);
      if ('error' in found) {
        return { ok: false, error: found.error };
      }
      const zipPath = resolveBackup(found.target.dir, name);
      if (!zipPath || !fs.existsSync(zipPath)) {
        return { ok: false, error: 'Резервная копия не найдена' };
      }
      try {
        // Safety net: keep what is there now, so a wrong restore can be undone.
        if (fs.existsSync(found.savesAbs)) {
          await createBackup(found.target.dir, found.savesAbs, 'before-restore');
        } else {
          await fs.promises.mkdir(found.savesAbs, { recursive: true });
        }
        await restoreBackup(zipPath, found.savesAbs);
        emitLauncherAction('backup-restored');

        return await backupResult(found.target);
      } catch (err) {
        return failure(err);
      }
    },
  );

  ipcMain.handle(
    'content:backup-delete',
    async (_event, appId: unknown, name: unknown): Promise<BackupResult> => {
      const found = await withSavesTarget(appId);
      if ('error' in found) {
        return { ok: false, error: found.error };
      }
      const zipPath = resolveBackup(found.target.dir, name);
      if (!zipPath) {
        return { ok: false, error: 'Некорректное имя копии' };
      }
      try {
        await fs.promises.rm(zipPath, { force: true });

        return await backupResult(found.target);
      } catch (err) {
        return failure(err);
      }
    },
  );

  ipcMain.handle('content:backup-open', async (_event, appId: unknown): Promise<LaunchResult> => {
    const found = await withSavesTarget(appId);
    if ('error' in found) {
      return { ok: false, error: found.error };
    }
    const dir = backupsDirOf(found.target.dir);
    await fs.promises.mkdir(dir, { recursive: true });
    const error = await shell.openPath(dir);

    return error ? { ok: false, error } : { ok: true };
  });

  ipcMain.handle('content:open-settings', async (_event, appId: unknown): Promise<LaunchResult> => {
    if (typeof appId !== 'string') {
      return { ok: false, error: 'Некорректный идентификатор приложения' };
    }

    const target = (await scanContent()).find((appEntry) => appEntry.id === appId);
    if (!target?.settingsAbs) {
      return { ok: false, error: 'Не найдены внешние настройки' };
    }

    return announceIfOk('settings-opened', launchPath(target.settingsAbs));
  });
}

/** Call once, after `app` is ready. */
export function initContent(): void {
  registerProtocol();
  registerIpc();
}
