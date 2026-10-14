import * as fs from 'fs';
import * as path from 'path';

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';

import { getContentDir } from './content';

/**
 * Torrent downloads into a game's `installer/` folder unless another folder is chosen. `webtorrent` is ESM-only, so it is loaded with a real
 * dynamic `import()` (TypeScript would turn a plain one into `require`) and only when a torrent is first needed.
 * Pausing really disconnects the torrent (it is removed from the client with its files kept and added again on
 * resume), because WebTorrent's own `pause()` only stops looking for new peers.
 */

type TorrentState = 'metadata' | 'downloading' | 'seeding' | 'paused' | 'error';

interface TorrentView {
  id: string;
  gameId: string;
  name: string;
  state: TorrentState;
  error: string | null;
  /** 0–1 */
  progress: number;
  size: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  /** Connected peers that have every piece. */
  seeds: number;
  /** Connected peers that do not (leechers). */
  peers: number;
  /** Seeds in the whole swarm, as the trackers report it; `null` until a tracker has answered. */
  swarmSeeds: number | null;
  /** Leechers in the whole swarm, as the trackers report it; `null` until a tracker has answered. */
  swarmPeers: number | null;
  /** Seconds left, or `null` when unknown. */
  eta: number | null;
  ratio: number;
  addedAt: number;
}

interface TorrentInspection {
  infoHash: string;
  name: string | null;
  /** `null` for a magnet link — the size is only known once the metadata arrives. */
  size: number | null;
}

type TorrentResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

interface StoredTorrent {
  infoHash: string;
  magnet: string | null;
  gameId: string;
  dir: string;
  name: string;
  size: number;
  paused: boolean;
  addedAt: number;
  downloaded: number;
  uploaded: number;
  /** Completion has been announced; a restart re-checks the files and fires `done` again, which is not news. */
  completed?: boolean;
}

interface WtWire {
  /** Pieces the peer has. */
  peerPieces?: { get: (index: number) => boolean };
}

interface WtTracker {
  on: (event: 'update', listener: (data: { announce?: string; complete?: number; incomplete?: number }) => void) => void;
}

interface StoreFile {
  path: string;
  open: (cb: (err: Error | null, file?: unknown) => void) => void;
}

interface WtTorrent {
  store?: unknown;
  discovery?: { tracker?: WtTracker } | null;
  infoHash: string;
  name: string;
  length: number;
  ready: boolean;
  done: boolean;
  progress: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  timeRemaining: number;
  ratio: number;
  wires: WtWire[];
  pieces: unknown[];
  on: (event: string, listener: (...args: unknown[]) => void) => void;
}

interface WtClient {
  add: (source: Buffer | string, options: { path: string }) => WtTorrent;
  remove: (infoHash: string) => Promise<void>;
  destroy: () => Promise<void> | void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
}

interface ParsedTorrent {
  infoHash: string;
  name?: string;
  length?: number;
}

interface Entry {
  stored: StoredTorrent;
  torrent: WtTorrent | null;
  error: string | null;
  /** What each tracker last said about the swarm, by announce url. */
  swarm: Map<string, { seeds: number; leechers: number }>;
  trackerHooked: boolean;
}

const MAGNET_PATTERN = /^magnet:\?.*xt=urn:btih:/i;
const MAX_TORRENT_FILE_BYTES = 5 * 1024 * 1024;
const TICK_MS = 1000;
const LEGACY_COMPLETED_AFTER_MS = 10 * 60 * 1000;
const SAVE_EVERY_TICKS = 10;

// A literal `new Function` keeps TypeScript from rewriting `import()` into `require()`, which can't load an ESM package.
// eslint-disable-next-line no-new-func
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<{
  default: unknown;
}>;

const entries = new Map<string, Entry>();

let client: WtClient | null = null;
let clientPromise: Promise<WtClient> | null = null;
let tickTimer: NodeJS.Timeout | null = null;
let tickCount = 0;

const stateFile = (): string => path.join(app.getPath('userData'), 'torrents.json');
const torrentFilesDir = (): string => path.join(app.getPath('userData'), 'torrents');
const torrentFilePath = (infoHash: string): string => path.join(torrentFilesDir(), `${infoHash}.torrent`);

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const parseSource = async (source: Buffer | string): Promise<ParsedTorrent> => {
  const parseTorrent = (await dynamicImport('parse-torrent')).default as (input: Buffer | string) => Promise<ParsedTorrent>;
  const parsed = await parseTorrent(source);

  if (!parsed || typeof parsed.infoHash !== 'string' || !/^[0-9a-f]{40}$/i.test(parsed.infoHash)) {
    throw new Error('Invalid torrent');
  }

  return parsed;
};

const getClient = (): Promise<WtClient> => {
  clientPromise ??= (async () => {
    const WebTorrent = (await dynamicImport('webtorrent')).default as new () => WtClient;
    const created = new WebTorrent();

    created.on('error', (err) => console.error('[torrents] client error:', err));
    client = created;

    return created;
  })();

  return clientPromise;
};

const loadStored = (): StoredTorrent[] => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(stateFile(), 'utf-8'));

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is StoredTorrent =>
            item && typeof item.infoHash === 'string' && typeof item.gameId === 'string' && typeof item.dir === 'string',
        )
      : [];
  } catch {
    return [];
  }
};

const saveStored = (): void => {
  try {
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
    fs.writeFileSync(stateFile(), JSON.stringify([...entries.values()].map((entry) => entry.stored), null, 2), 'utf-8');
  } catch (err) {
    console.error('[torrents] save failed:', err);
  }
};

/** Bytes of the torrent already on disk. `torrent.downloaded` only counts what arrived during this run, so after a
 * restart a half-done (or finished) torrent would read as 0. */
const bytesOnDisk = (torrent: WtTorrent): number =>
  torrent.ready && torrent.length > 0 ? Math.round(torrent.progress * torrent.length) : torrent.downloaded;

const syncStoredStats = (entry: Entry): void => {
  const torrent = entry.torrent;

  if (!torrent) {
    return;
  }

  if (torrent.name) {
    entry.stored.name = torrent.name;
  }
  if (torrent.length) {
    entry.stored.size = torrent.length;
  }
  entry.stored.downloaded = bytesOnDisk(torrent);
  entry.stored.uploaded = torrent.uploaded;
};

/**
 * Peers that have every piece. WebTorrent's own `wire.isSeeder` is unusable here: it is set for every fresh
 * connection (before the peer has sent which pieces it owns) and never cleared again.
 */
const countSeeds = (torrent: WtTorrent): number => {
  const pieceCount = torrent.pieces.length;

  if (!torrent.ready || pieceCount === 0) {
    return 0;
  }

  return torrent.wires.filter((wire) => {
    const pieces = wire.peerPieces;

    if (!pieces) {
      return false;
    }

    for (let index = 0; index < pieceCount; index += 1) {
      if (!pieces.get(index)) {
        return false;
      }
    }

    return true;
  }).length;
};

/** The torrent's tracker client only exists a moment after `add`, so the hook is retried from the tick. */
const hookTracker = (entry: Entry): void => {
  const tracker = entry.torrent?.discovery?.tracker;

  if (entry.trackerHooked || !tracker) {
    return;
  }

  entry.trackerHooked = true;
  tracker.on('update', (data) => {
    if (typeof data.complete === 'number' && typeof data.incomplete === 'number') {
      entry.swarm.set(data.announce ?? '', { seeds: data.complete, leechers: data.incomplete });
    }
  });
};

const swarmTotals = (entry: Entry): { seeds: number | null; leechers: number | null } => {
  const reports = [...entry.swarm.values()];

  return reports.length === 0
    ? { seeds: null, leechers: null }
    : { seeds: Math.max(...reports.map((report) => report.seeds)), leechers: Math.max(...reports.map((report) => report.leechers)) };
};

/**
 * WebTorrent keeps every file open for writing for as long as the torrent lives, and Windows refuses to run an
 * .exe that somebody has open for writing ("the program is busy"). Once the download is done the files are
 * swapped for read-only handles, which is all seeding needs.
 */
const releaseWriteHandles = (torrent: WtTorrent): void => {
  let store = torrent.store as { files?: StoreFile[]; store?: unknown } | undefined;

  while (store && !store.files && store.store) {
    store = store.store as typeof store;
  }

  store?.files?.forEach((file) => {
    const writable = file.open;
    let handle: Promise<fs.promises.FileHandle> | null = null;

    file.open = (cb) => {
      handle ??= fs.promises.open(file.path, 'r');
      handle.then(
        (opened) =>
          cb(null, {
            read: (offset: number, length: number, done: (err: Error | null, buffer?: Buffer) => void) => {
              const buffer = Buffer.alloc(length);

              opened.read(buffer, 0, length, offset).then(
                () => done(null, buffer),
                (err: Error) => done(err),
              );
            },
            close: (done: () => void) => {
              opened.close().then(done, done);
            },
          }),
        (err: Error) => cb(err),
      );
    };

    writable((err, opened) => {
      if (!err && opened) {
        (opened as { close: (done: () => void) => void }).close(() => undefined);
      }
    });
  });
};

const toView = (entry: Entry): TorrentView => {
  const { stored, torrent } = entry;
  const live = !stored.paused && torrent;
  const size = stored.size;
  const downloaded = live ? bytesOnDisk(torrent) : stored.downloaded;
  const uploaded = live ? torrent.uploaded : stored.uploaded;

  let state: TorrentState = 'downloading';

  if (entry.error) {
    state = 'error';
  } else if (stored.paused) {
    state = 'paused';
  } else if (!torrent || !torrent.ready) {
    state = 'metadata';
  } else if (torrent.done) {
    state = 'seeding';
  }

  const timeRemaining = live ? torrent.timeRemaining : Infinity;
  const seeds = live ? countSeeds(torrent) : 0;
  const swarm = swarmTotals(entry);

  return {
    id: stored.infoHash,
    gameId: stored.gameId,
    name: stored.name,
    state,
    error: entry.error,
    progress: live && torrent.ready ? torrent.progress : size > 0 ? Math.min(1, stored.downloaded / size) : 0,
    size,
    downloaded,
    uploaded,
    downloadSpeed: live && state === 'downloading' ? torrent.downloadSpeed : 0,
    uploadSpeed: live ? torrent.uploadSpeed : 0,
    seeds,
    peers: live ? Math.max(0, torrent.numPeers - seeds) : 0,
    swarmSeeds: swarm.seeds,
    swarmPeers: swarm.leechers,
    eta: Number.isFinite(timeRemaining) && state === 'downloading' ? Math.round(timeRemaining / 1000) : null,
    ratio: downloaded > 0 ? uploaded / downloaded : 0,
    addedAt: stored.addedAt,
  };
};

const views = (): TorrentView[] => [...entries.values()].map(toView).sort((a, b) => b.addedAt - a.addedAt);

const broadcast = (channel: string, payload: unknown): void => {
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send(channel, payload));
};

const tick = (): void => {
  tickCount += 1;
  entries.forEach(syncStoredStats);
  entries.forEach(hookTracker);

  if (tickCount % SAVE_EVERY_TICKS === 0) {
    saveStored();
  }

  broadcast('torrents:updated', views());
};

const ensureTicking = (): void => {
  if (!tickTimer) {
    tickTimer = setInterval(tick, TICK_MS);
  }
};

const stopTickingIfIdle = (): void => {
  if (entries.size === 0 && tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
};

const startEntry = async (entry: Entry): Promise<void> => {
  if (entry.torrent) {
    return;
  }

  entry.error = null;
  entry.trackerHooked = false;

  try {
    const wt = await getClient();
    const source = entry.stored.magnet ?? fs.readFileSync(torrentFilePath(entry.stored.infoHash));

    fs.mkdirSync(entry.stored.dir, { recursive: true });

    const torrent = wt.add(source, { path: entry.stored.dir });
    entry.torrent = torrent;

    torrent.on('error', (err) => {
      entry.error = errorMessage(err);
      entry.torrent = null;
    });
    torrent.on('ready', () => {
      syncStoredStats(entry);
      saveStored();
    });
    torrent.on('done', () => {
      const firstTime = entry.stored.completed !== true;

      entry.stored.completed = true;
      releaseWriteHandles(torrent);
      syncStoredStats(entry);
      saveStored();

      if (firstTime) {
        broadcast('torrents:completed', { id: entry.stored.infoHash, gameId: entry.stored.gameId, name: entry.stored.name });
      }
    });
  } catch (err) {
    entry.error = errorMessage(err);
    entry.torrent = null;
  }
};

const stopEntry = async (entry: Entry): Promise<void> => {
  syncStoredStats(entry);

  if (entry.torrent && client) {
    try {
      await client.remove(entry.stored.infoHash);
    } catch (err) {
      console.error('[torrents] remove from client failed:', err);
    }
  }

  entry.torrent = null;
};

const gameInstallerDir = (gameId: unknown): string | null => {
  if (typeof gameId !== 'string' || !gameId || /[\\/]/.test(gameId) || gameId === '..' || gameId === '.') {
    return null;
  }

  const root = getContentDir();
  const gameDir = path.resolve(root, gameId);

  if (!gameDir.startsWith(root + path.sep) || !fs.existsSync(gameDir)) {
    return null;
  }

  return path.join(gameDir, 'installer');
};

const readSource = async (source: unknown): Promise<{ parsed: ParsedTorrent; magnet: string | null; file: Buffer | null }> => {
  const input = source as { magnet?: unknown; file?: unknown } | null;

  if (input && typeof input.magnet === 'string') {
    const magnet = input.magnet.trim();

    if (!MAGNET_PATTERN.test(magnet)) {
      throw new Error('Invalid magnet link');
    }

    return { parsed: await parseSource(magnet), magnet, file: null };
  }

  if (input && typeof input.file === 'string') {
    const filePath = input.file;

    if (path.extname(filePath).toLowerCase() !== '.torrent' || !fs.statSync(filePath).isFile()) {
      throw new Error('Invalid torrent file');
    }
    if (fs.statSync(filePath).size > MAX_TORRENT_FILE_BYTES) {
      throw new Error('The torrent file is too large');
    }

    const file = fs.readFileSync(filePath);

    return { parsed: await parseSource(file), magnet: null, file };
  }

  throw new Error('No torrent source');
};

const inspectTorrent = async (source: unknown): Promise<TorrentResult<{ torrent: TorrentInspection }>> => {
  try {
    const { parsed } = await readSource(source);

    return {
      ok: true,
      torrent: { infoHash: parsed.infoHash, name: parsed.name ?? null, size: parsed.length ?? null },
    };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

/** The folder the user picked, or the game's own `installer/` when nothing was picked. */
const resolveDownloadDir = (gameId: unknown, downloadDir: unknown): string | null => {
  const defaultDir = gameInstallerDir(gameId);

  if (!defaultDir || downloadDir === undefined || downloadDir === null || downloadDir === '') {
    return defaultDir;
  }

  return typeof downloadDir === 'string' && path.isAbsolute(downloadDir) ? path.resolve(downloadDir) : null;
};

const addTorrent = async (
  source: unknown,
  gameId: unknown,
  downloadDir?: unknown,
): Promise<TorrentResult<{ torrent: TorrentView }>> => {
  try {
    const dir = resolveDownloadDir(gameId, downloadDir);

    if (!dir) {
      return { ok: false, error: 'Game folder not found' };
    }

    const { parsed, magnet, file } = await readSource(source);
    const infoHash = parsed.infoHash.toLowerCase();

    if (entries.has(infoHash)) {
      return { ok: false, error: 'This torrent has already been added' };
    }

    if (file) {
      fs.mkdirSync(torrentFilesDir(), { recursive: true });
      fs.writeFileSync(torrentFilePath(infoHash), file);
    }

    const entry: Entry = {
      stored: {
        infoHash,
        magnet,
        gameId: gameId as string,
        dir,
        name: parsed.name ?? '',
        size: parsed.length ?? 0,
        paused: false,
        addedAt: Date.now(),
        downloaded: 0,
        uploaded: 0,
        completed: false,
      },
      torrent: null,
      error: null,
      swarm: new Map(),
      trackerHooked: false,
    };

    entries.set(infoHash, entry);
    saveStored();
    ensureTicking();
    await startEntry(entry);

    if (entry.error) {
      return { ok: false, error: entry.error };
    }

    return { ok: true, torrent: toView(entry) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};

const findEntry = (id: unknown): Entry | null => (typeof id === 'string' ? (entries.get(id) ?? null) : null);

const pauseTorrent = async (id: unknown): Promise<TorrentResult> => {
  const entry = findEntry(id);

  if (!entry) {
    return { ok: false, error: 'Torrent not found' };
  }

  entry.stored.paused = true;
  await stopEntry(entry);
  saveStored();
  broadcast('torrents:updated', views());

  return { ok: true };
};

const resumeTorrent = async (id: unknown): Promise<TorrentResult> => {
  const entry = findEntry(id);

  if (!entry) {
    return { ok: false, error: 'Torrent not found' };
  }

  entry.stored.paused = false;
  await stopEntry(entry);
  await startEntry(entry);
  saveStored();
  broadcast('torrents:updated', views());

  return entry.error ? { ok: false, error: entry.error } : { ok: true };
};

const removeTorrent = async (id: unknown, deleteFiles: unknown): Promise<TorrentResult> => {
  const entry = findEntry(id);

  if (!entry) {
    return { ok: false, error: 'Torrent not found' };
  }

  await stopEntry(entry);
  entries.delete(entry.stored.infoHash);

  try {
    await fs.promises.rm(torrentFilePath(entry.stored.infoHash), { force: true });

    if (deleteFiles === true && entry.stored.name) {
      const target = path.resolve(entry.stored.dir, entry.stored.name);

      if (target.startsWith(path.resolve(entry.stored.dir) + path.sep)) {
        // The torrent's file handles are released a moment after it is removed from the client.
        await fs.promises.rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
      }
    }
  } catch (err) {
    console.error('[torrents] cleanup failed:', err);
  }

  saveStored();
  stopTickingIfIdle();
  broadcast('torrents:updated', views());

  return { ok: true };
};

const openTorrentFolder = async (id: unknown): Promise<TorrentResult> => {
  const entry = findEntry(id);

  if (!entry) {
    return { ok: false, error: 'Torrent not found' };
  }

  const target = path.join(entry.stored.dir, entry.stored.name);

  // A single-file torrent's target is the file itself, and `openPath` on it would run it (an installer, say):
  // such a file is only revealed in the file manager.
  if (entry.stored.name && fs.existsSync(target) && fs.statSync(target).isFile()) {
    shell.showItemInFolder(target);

    return { ok: true };
  }

  const failure = await shell.openPath(fs.existsSync(target) ? target : entry.stored.dir);

  return failure ? { ok: false, error: failure } : { ok: true };
};

const pickDownloadFolder = async (event: Electron.IpcMainInvokeEvent): Promise<string | null> => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const options: Electron.OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] };
  const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);

  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
};

const pickTorrentFile = async (event: Electron.IpcMainInvokeEvent): Promise<{ path: string; name: string } | null> => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const options: Electron.OpenDialogOptions = {
    properties: ['openFile'],
    filters: [{ name: 'Torrent', extensions: ['torrent'] }],
  };
  const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return { path: result.filePaths[0], name: path.basename(result.filePaths[0]) };
};

/** Call once, after `app` is ready. Torrents saved by a previous run resume on their own, unless they were paused. */
export function initTorrents(): void {
  loadStored().forEach((stored) => {
    // Entries saved before the flag existed: one that has been around for a while is taken as already announced.
    if (typeof stored.completed !== 'boolean') {
      stored.completed = Date.now() - stored.addedAt > LEGACY_COMPLETED_AFTER_MS;
    }

    entries.set(stored.infoHash, { stored, torrent: null, error: null, swarm: new Map(), trackerHooked: false });
  });

  if (entries.size > 0) {
    ensureTicking();
    entries.forEach((entry) => {
      if (!entry.stored.paused) {
        void startEntry(entry);
      }
    });
  }

  ipcMain.handle('torrents:list', () => views());
  ipcMain.handle('torrents:inspect', (_event, source: unknown) => inspectTorrent(source));
  ipcMain.handle('torrents:pick-file', (event) => pickTorrentFile(event));
  ipcMain.handle('torrents:pick-folder', (event) => pickDownloadFolder(event));
  ipcMain.handle('torrents:default-dir', (_event, gameId: unknown) => gameInstallerDir(gameId));
  ipcMain.handle('torrents:add', (_event, source: unknown, gameId: unknown, downloadDir?: unknown) =>
    addTorrent(source, gameId, downloadDir),
  );
  ipcMain.handle('torrents:pause', (_event, id: unknown) => pauseTorrent(id));
  ipcMain.handle('torrents:resume', (_event, id: unknown) => resumeTorrent(id));
  ipcMain.handle('torrents:remove', (_event, id: unknown, deleteFiles: unknown) => removeTorrent(id, deleteFiles));
  ipcMain.handle('torrents:open-folder', (_event, id: unknown) => openTorrentFolder(id));

  app.on('before-quit', () => {
    entries.forEach(syncStoredStats);
    saveStored();
    void client?.destroy();
  });
}
