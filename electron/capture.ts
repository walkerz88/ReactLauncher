import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, protocol, screen, shell } from 'electron';

import { getRunningIds, onRunningEvent } from './launch';
import type { ProfileFiles } from './profileFiles';
import { profilesDir } from './profiles';
import type { createProgress } from './progress';
import { setOverlayRecordingState, showOverlayToast } from './overlayWindow';

/**
 * In-game screenshots (Ctrl+Shift+F9) and short recordings (Ctrl+Shift+F10), captured over the whole
 * screen via `desktopCapturer` — games run as their own detached process (`launch.ts`), outside
 * Electron's window, so this is the only way to see them. Screenshots are taken entirely in the main
 * process (a `desktopCapturer` thumbnail at full resolution); recording needs an actual
 * `MediaRecorder`, which only exists in a renderer, so the recording hotkey hands the source id to
 * the always-open main window and gets the finished bytes back (see `widgets/CaptureManager` on the
 * renderer side).
 *
 * Media is stored per-profile, per-game, next to the profile files themselves (not inside the sealed
 * `<id>.json` — binary media isn't practical to seal, and it isn't sensitive the way settings are):
 *   <profilesDir>/<profileId>/media/<gameId>/screenshots/*.png
 *   <profilesDir>/<profileId>/media/<gameId>/recordings/*.webm
 */

const SCHEME = 'media';

// Must run before `app` is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// Bare F9/F10 are quicksave/quickload (or other menu actions) in a lot of older games, so a
// three-key combo is used instead — one that essentially nothing binds to on its own.
export const SCREENSHOT_ACCELERATOR = 'CommandOrControl+Shift+F9';
export const TOGGLE_RECORDING_ACCELERATOR = 'CommandOrControl+Shift+F10';

export const MAX_RECORDING_SECONDS = 20;
const MIN_FREE_BYTES_FOR_RECORDING = 300 * 1024 * 1024;
const MAX_ITEMS_PER_FOLDER = 200;

const GAME_ID_PATTERN = /^[^/\\]{1,200}$/;

/** Renderer-supplied game ids are used to build a file path — reject anything with a separator. */
const safeGameId = (value: unknown): string | null =>
  typeof value === 'string' && GAME_ID_PATTERN.test(value) && !value.includes('..') ? value : null;

const mediaDir = (profileId: string, gameId: string, kind: 'screenshots' | 'recordings'): string =>
  path.join(profilesDir(), profileId, 'media', gameId, kind);

const listFolder = (folder: string, extension: string): string[] => {
  try {
    return fs
      .readdirSync(folder)
      .filter((name) => name.toLowerCase().endsWith(extension))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .slice(0, MAX_ITEMS_PER_FOLDER);
  } catch {
    return [];
  }
};

const toMediaUrl = (absPath: string): string => {
  const rel = path
    .relative(profilesDir(), absPath)
    .split(path.sep)
    .map(encodeURIComponent)
    .join('/');

  return `${SCHEME}://local/${rel}`;
};

/** Reverses `toMediaUrl`, rejecting anything that isn't a `media://` URL resolving inside `profilesDir()` —
 * shared by `capture:delete` and `capture:reveal`, both of which act on a renderer-supplied URL. */
const resolveMediaUrl = (urlRaw: unknown): string | null => {
  if (typeof urlRaw !== 'string') {
    return null;
  }

  try {
    const { protocol: urlProtocol, pathname } = new URL(urlRaw);

    if (urlProtocol !== `${SCHEME}:`) {
      return null;
    }

    const rel = pathname
      .replace(/^\/+/, '')
      .split('/')
      .map(decodeURIComponent)
      .join(path.sep);
    const root = profilesDir();
    const abs = path.resolve(root, rel);

    return abs === root || abs.startsWith(root + path.sep) ? abs : null;
  } catch {
    return null;
  }
};

const MIME_BY_EXT: Record<string, string> = { '.png': 'image/png', '.webm': 'video/webm' };

/** Streams a `.webm` with HTTP Range support, which `<video>` needs for seeking. */
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
      const root = profilesDir();
      const abs = path.resolve(root, rel);

      if (abs !== root && !abs.startsWith(root + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }

      const extension = path.extname(abs).toLowerCase();
      const mime = MIME_BY_EXT[extension] ?? 'application/octet-stream';

      if (extension === '.webm') {
        return serveVideo(abs, mime, request.headers.get('range'));
      }

      const data = await fs.promises.readFile(abs);

      return new Response(data, { headers: { 'Content-Type': mime } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

/** A single `desktopCapturer` source for the primary display, or `null` if none is available. */
async function primaryDisplaySource(): Promise<Electron.DesktopCapturerSource | null> {
  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({ types: ['screen'] });

  return sources.find((source) => source.display_id === String(display.id)) ?? sources[0] ?? null;
}

/** Call once, after `app` is ready, after `initProfiles`/`initProgress`. */
export function initCapture(files: ProfileFiles, progress: ReturnType<typeof createProgress>, getMainWindow: () => BrowserWindow | null): void {
  registerProtocol();

  let currentGameId: string | null = null;
  let recordingActive = false;
  let recordingGameId: string | null = null;

  const stopRecordingSignal = (): void => {
    recordingActive = false;
    setOverlayRecordingState(false);
    getMainWindow()?.webContents.send('capture:stop-recording');
  };

  const onScreenshot = async (): Promise<void> => {
    const profileId = files.getActiveId();
    const gameId = currentGameId;

    if (!profileId || !gameId) {
      return;
    }

    try {
      const display = screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.round(display.size.width * display.scaleFactor), height: Math.round(display.size.height * display.scaleFactor) },
      });
      const source = sources.find((entry) => entry.display_id === String(display.id)) ?? sources[0];

      if (!source || source.thumbnail.isEmpty()) {
        showOverlayToast('Не удалось сделать скриншот / Could not take a screenshot');

        return;
      }

      const dir = mediaDir(profileId, gameId, 'screenshots');
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(path.join(dir, `${Date.now()}.png`), source.thumbnail.toPNG());

      progress.recordEvent('screenshot', gameId);
      showOverlayToast('Скриншот сохранён / Screenshot saved');
      getMainWindow()?.webContents.send('capture:screenshot-taken', { gameId });
    } catch (err) {
      console.error('[capture] screenshot failed:', err);
    }
  };

  const hasEnoughDiskSpace = async (): Promise<boolean> => {
    try {
      const stat = await fs.promises.statfs(profilesDir());

      return stat.bavail * stat.bsize >= MIN_FREE_BYTES_FOR_RECORDING;
    } catch {
      // A failed disk check shouldn't itself block recording.
      return true;
    }
  };

  const onToggleRecording = async (): Promise<void> => {
    const win = getMainWindow();
    const profileId = files.getActiveId();
    const gameId = currentGameId;

    if (!win || !profileId || !gameId) {
      return;
    }

    if (recordingActive) {
      stopRecordingSignal();

      return;
    }

    if (!(await hasEnoughDiskSpace())) {
      showOverlayToast('Недостаточно места на диске / Not enough disk space');

      return;
    }

    const source = await primaryDisplaySource();

    if (!source) {
      showOverlayToast('Не удалось начать запись / Could not start recording');

      return;
    }

    recordingActive = true;
    recordingGameId = gameId;
    setOverlayRecordingState(true, MAX_RECORDING_SECONDS);
    win.webContents.send('capture:start-recording', { gameId, sourceId: source.id, maxSeconds: MAX_RECORDING_SECONDS });
  };

  onRunningEvent((event) => {
    if (event.type === 'started') {
      const wasEmpty = currentGameId === null;
      currentGameId = event.id;

      if (wasEmpty) {
        globalShortcut.register(SCREENSHOT_ACCELERATOR, () => void onScreenshot());
        globalShortcut.register(TOGGLE_RECORDING_ACCELERATOR, () => void onToggleRecording());
      }

      return;
    }

    const stillRunning = getRunningIds();

    if (stillRunning.length === 0) {
      currentGameId = null;
      globalShortcut.unregister(SCREENSHOT_ACCELERATOR);
      globalShortcut.unregister(TOGGLE_RECORDING_ACCELERATOR);

      if (recordingActive) {
        stopRecordingSignal();
      }
    } else {
      currentGameId = stillRunning[stillRunning.length - 1];
    }
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());

  ipcMain.handle('capture:list', (_event, gameIdRaw: unknown) => {
    const gameId = safeGameId(gameIdRaw);
    const profileId = files.getActiveId();

    if (!gameId || !profileId) {
      return { screenshots: [], recordings: [] };
    }

    return {
      screenshots: listFolder(mediaDir(profileId, gameId, 'screenshots'), '.png').map((name) =>
        toMediaUrl(path.join(mediaDir(profileId, gameId, 'screenshots'), name)),
      ),
      recordings: listFolder(mediaDir(profileId, gameId, 'recordings'), '.webm').map((name) =>
        toMediaUrl(path.join(mediaDir(profileId, gameId, 'recordings'), name)),
      ),
    };
  });

  ipcMain.handle('capture:sizes', async (): Promise<Record<string, number>> => {
    const profileId = files.getActiveId();
    const result: Record<string, number> = {};

    if (!profileId) {
      return result;
    }

    try {
      const root = path.join(profilesDir(), profileId, 'media');
      const gameIds = await fs.promises.readdir(root);

      for (const gameId of gameIds) {
        let total = 0;

        for (const kind of ['screenshots', 'recordings'] as const) {
          const dir = mediaDir(profileId, gameId, kind);
          const names = await fs.promises.readdir(dir).catch(() => [] as string[]);
          const stats = await Promise.all(names.map((name) => fs.promises.stat(path.join(dir, name)).catch(() => null)));

          total += stats.reduce((sum, stat) => sum + (stat?.isFile() ? stat.size : 0), 0);
        }

        result[gameId] = total;
      }
    } catch {
      // No media folder yet — nothing captured.
    }

    return result;
  });

  ipcMain.handle('capture:save-recording', async (_event, gameIdRaw: unknown, bytesRaw: unknown) => {
    recordingActive = false;
    setOverlayRecordingState(false);

    const gameId = safeGameId(gameIdRaw) ?? recordingGameId;
    const profileId = files.getActiveId();
    const bytes = bytesRaw instanceof ArrayBuffer ? new Uint8Array(bytesRaw) : bytesRaw instanceof Uint8Array ? bytesRaw : null;

    recordingGameId = null;

    if (!gameId || !profileId || !bytes || bytes.length === 0) {
      return;
    }

    try {
      const dir = mediaDir(profileId, gameId, 'recordings');
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(path.join(dir, `${Date.now()}.webm`), Buffer.from(bytes));

      progress.recordEvent('recording', gameId);
      showOverlayToast('Запись сохранена / Recording saved');
      getMainWindow()?.webContents.send('capture:recording-saved', { gameId });
    } catch (err) {
      console.error('[capture] saving recording failed:', err);
    }
  });

  ipcMain.handle('capture:delete', async (_event, urlRaw: unknown): Promise<boolean> => {
    const abs = resolveMediaUrl(urlRaw);

    if (!abs) {
      return false;
    }

    try {
      await fs.promises.unlink(abs);

      return true;
    } catch (err) {
      console.error('[capture] delete failed:', err);

      return false;
    }
  });

  ipcMain.handle('capture:reveal', (_event, urlRaw: unknown): boolean => {
    const abs = resolveMediaUrl(urlRaw);

    if (!abs) {
      return false;
    }

    shell.showItemInFolder(abs);

    return true;
  });
}
