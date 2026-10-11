import * as fs from 'fs';
import * as path from 'path';

import { app, ipcMain, type WebContents } from 'electron';
import extract from 'extract-zip';

import { getContentDir } from './content';
import { download, isAllowedUrl, readManifestUrl, type UpdateProgress } from './updater';

/**
 * The demo game offered on a first launch with an empty library. A build feature: the zip's address is
 * `demo.url` in `package.json` (a zip whose top-level folder is the game folder, so unpacking it into the content
 * folder is all that is needed); without it nothing is offered. Its sha256 and size come from the update manifest's
 * `demo` entry (written by `site/deploy/deploy.mjs`), which has to describe that same url — an archive that
 * cannot be verified is never downloaded. The renderer never passes URLs in.
 */

const MANIFEST_TIMEOUT_MS = 15_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

interface DemoManifest {
  url: string;
  sha256: string;
  size: number;
}

export interface DemoProgress {
  phase: 'download' | 'extract';
  received: number;
  total: number;
}

type DemoResult = { ok: true } | { ok: false; cancelled: boolean; error: string };

let manifest: DemoManifest | null = null;
let controller: AbortController | null = null;

const readDemoUrl = (): string | null => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8')) as {
      demo?: { url?: unknown };
    };
    const value = pkg.demo?.url;

    return typeof value === 'string' && isAllowedUrl(value) && new URL(value).pathname.toLowerCase().endsWith('.zip')
      ? value
      : null;
  } catch {
    return null;
  }
};

async function loadManifest(): Promise<DemoManifest | null> {
  const demoUrl = readDemoUrl();
  const manifestUrl = readManifestUrl();

  if (!demoUrl || !manifestUrl) {
    return null;
  }

  try {
    const response = await fetch(manifestUrl, { signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS), cache: 'no-store' });

    if (!response.ok) {
      return null;
    }

    const demo = ((await response.json()) as { demo?: Partial<DemoManifest> }).demo;

    if (!demo || typeof demo.url !== 'string' || typeof demo.sha256 !== 'string' || !SHA256_PATTERN.test(demo.sha256)) {
      return null;
    }

    if (new URL(demo.url, manifestUrl).toString() !== new URL(demoUrl).toString()) {
      return null;
    }

    return {
      url: demoUrl,
      sha256: demo.sha256.toLowerCase(),
      size: typeof demo.size === 'number' && demo.size > 0 ? demo.size : 0,
    };
  } catch {
    return null;
  }
}

async function downloadDemo(sender: WebContents): Promise<DemoResult> {
  if (controller) {
    return { ok: false, cancelled: false, error: 'Already downloading' };
  }

  const current = manifest ?? (await loadManifest());

  if (!current) {
    return { ok: false, cancelled: false, error: 'The demo game is not available' };
  }

  controller = new AbortController();

  const { signal } = controller;
  const partial = path.join(app.getPath('temp'), 'react-launcher-demo.zip.download');
  const send = (progress: DemoProgress) => {
    if (!sender.isDestroyed()) {
      sender.send('demo:progress', progress);
    }
  };

  try {
    const hash = await download(
      current.url,
      partial,
      current.size,
      ({ received, total }: UpdateProgress) => send({ phase: 'download', received, total }),
      signal,
    );

    if (hash !== current.sha256) {
      throw new Error('Checksum mismatch');
    }

    send({ phase: 'extract', received: 0, total: 0 });

    const contentDir = getContentDir();

    await fs.promises.mkdir(contentDir, { recursive: true });
    await extract(partial, { dir: contentDir });

    return { ok: true };
  } catch (error) {
    if (signal.aborted) {
      return { ok: false, cancelled: true, error: 'Cancelled' };
    }

    console.error('[demo] download failed:', error);

    return { ok: false, cancelled: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    controller = null;
    await fs.promises.rm(partial, { force: true }).catch(() => undefined);
  }
}

export function initDemo(): void {
  ipcMain.handle('demo:info', async (): Promise<{ size: number } | null> => {
    manifest = await loadManifest();

    return manifest ? { size: manifest.size } : null;
  });
  ipcMain.handle('demo:download', (event): Promise<DemoResult> => downloadDemo(event.sender));
  ipcMain.handle('demo:cancel', (): void => {
    controller?.abort();
  });
}
