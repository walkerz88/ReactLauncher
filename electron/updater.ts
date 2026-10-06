import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

import { app, ipcMain, shell, type WebContents } from 'electron';

/**
 * Self-update for the portable build. `package.json`'s `updates.manifestUrl` points at a `latest.json`
 * (written by `site/deploy/deploy.mjs`) with the newest version, its download URL, sha256 and the full
 * changelog. No `updates.manifestUrl` → the feature is off. The renderer never passes URLs in: it only asks
 * to check and to install what the last check found.
 */

const MANIFEST_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 30 * 60_000;
const PROGRESS_INTERVAL_MS = 150;
const EXE_NAME_PATTERN = /^[\w .()-]+\.exe$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

interface ChangelogText {
  ru: string;
  en: string;
}

interface ChangelogEntry {
  version: string;
  date?: string;
  title: ChangelogText;
  changes: ChangelogText[];
}

export interface UpdateInfo {
  version: string;
  /** Entries newer than the running version and up to the new one, newest first. */
  changelog: ChangelogEntry[];
}

export type UpdateCheckResult =
  | { status: 'disabled' }
  | { status: 'current' }
  | { status: 'error' }
  | { status: 'available'; update: UpdateInfo };

export type UpdateInstallResult =
  | { status: 'restarting' }
  | { status: 'downloaded'; path: string }
  | { status: 'error' };

export interface UpdateProgress {
  received: number;
  /** 0 when the server did not report a size. */
  total: number;
}

interface PendingUpdate {
  version: string;
  url: string;
  sha256: string;
  size: number;
}

let pending: PendingUpdate | null = null;
let installing = false;

const readManifestUrl = (): string | null => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8')) as {
      updates?: { manifestUrl?: unknown };
    };
    const value = pkg.updates?.manifestUrl;

    return typeof value === 'string' && isAllowedUrl(value) ? value : null;
  } catch {
    return null;
  }
};

/** https only; plain http just for a local test server. */
function isAllowedUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch {
    return false;
  }
}

const parseVersion = (value: string): number[] | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);

  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

/** Negative if `a` is older than `b`, 0 if equal, positive if newer. */
const compareVersions = (a: number[], b: number[]): number => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }

  return 0;
};

const isLocalizedText = (value: unknown): value is ChangelogText => {
  const text = value as Partial<ChangelogText> | null;

  return typeof text?.ru === 'string' && typeof text.en === 'string';
};

const isChangelogEntry = (value: unknown): value is ChangelogEntry => {
  const entry = value as Partial<ChangelogEntry> | null;

  return (
    typeof entry?.version === 'string' &&
    isLocalizedText(entry.title) &&
    Array.isArray(entry.changes) &&
    entry.changes.every(isLocalizedText)
  );
};

async function checkForUpdate(): Promise<UpdateCheckResult> {
  const manifestUrl = readManifestUrl();

  if (!manifestUrl) {
    return { status: 'disabled' };
  }

  try {
    const response = await fetch(manifestUrl, {
      signal: AbortSignal.timeout(MANIFEST_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (!response.ok) {
      return { status: 'error' };
    }

    const manifest = (await response.json()) as {
      version?: unknown;
      url?: unknown;
      sha256?: unknown;
      size?: unknown;
      changelog?: unknown;
    };
    const latest = typeof manifest.version === 'string' ? parseVersion(manifest.version) : null;
    const current = parseVersion(app.getVersion());

    if (
      !latest ||
      !current ||
      typeof manifest.url !== 'string' ||
      typeof manifest.sha256 !== 'string' ||
      !SHA256_PATTERN.test(manifest.sha256)
    ) {
      return { status: 'error' };
    }

    if (compareVersions(latest, current) <= 0) {
      pending = null;

      return { status: 'current' };
    }

    const url = new URL(manifest.url, manifestUrl).toString();

    if (!isAllowedUrl(url) || !EXE_NAME_PATTERN.test(decodeURIComponent(path.posix.basename(new URL(url).pathname)))) {
      return { status: 'error' };
    }

    const entries = Array.isArray(manifest.changelog) ? manifest.changelog.filter(isChangelogEntry) : [];
    const changelog = entries
      .filter((entry) => {
        const version = parseVersion(entry.version);

        return version !== null && compareVersions(version, current) > 0 && compareVersions(version, latest) <= 0;
      })
      .reverse();

    pending = {
      version: manifest.version as string,
      url,
      sha256: manifest.sha256.toLowerCase(),
      size: typeof manifest.size === 'number' && manifest.size > 0 ? manifest.size : 0,
    };

    return { status: 'available', update: { version: pending.version, changelog } };
  } catch {
    return { status: 'error' };
  }
}

/** Streams `url` to `dest`, reporting bytes received so far, and resolves with the file's sha256. */
async function download(
  url: string,
  dest: string,
  sizeHint: number,
  onProgress: (progress: UpdateProgress) => void,
): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });

  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const total = Number(response.headers.get('content-length')) || sizeHint;
  const hash = crypto.createHash('sha256');
  let received = 0;
  let lastReport = 0;

  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      received += chunk.length;

      const now = Date.now();

      if (now - lastReport >= PROGRESS_INTERVAL_MS) {
        lastReport = now;
        onProgress({ received, total });
      }

      callback(null, chunk);
    },
  });

  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    counter,
    fs.createWriteStream(dest),
  );

  onProgress({ received, total: received });

  return hash.digest('hex');
}

/** Waits for the running exe to be released, swaps the new one in and starts it. Logs to `update.log` in the temp folder. */
const REPLACE_SCRIPT = `param([string]$Old, [string]$New, [string]$Target)
$log = Join-Path $env:TEMP 'react-launcher-update.log'
function Log($message) { Add-Content -LiteralPath $log -Value ("{0:s} {1}" -f (Get-Date), $message) }
Log "start: $Old -> $Target"
$deadline = (Get-Date).AddSeconds(60)
$done = $false
while ((Get-Date) -lt $deadline) {
  try {
    if (Test-Path -LiteralPath $Old) { Remove-Item -LiteralPath $Old -Force -ErrorAction Stop }
    Move-Item -LiteralPath $New -Destination $Target -Force -ErrorAction Stop
    $done = $true
    break
  } catch {
    Log ("retry: " + $_.Exception.Message)
    Start-Sleep -Milliseconds 500
  }
}
if ($done) {
  try { Start-Process -FilePath $Target; Log 'started new version' } catch { Log ("start failed: " + $_.Exception.Message) }
} else {
  Log 'gave up'
}
Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
`;

const runPowerShell = (script: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
      stdio: 'ignore',
      windowsHide: true,
    });

    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`powershell exited with ${code}`))));
  });

const quotePs = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/** The replacement script has to outlive this process, and a plain child process can be killed along with it
 * (the portable launcher runs the app inside a job object). So it is started through WMI, which makes it a
 * child of the WMI service instead; we wait until it has been created before quitting. */
async function launchReplacement(oldExe: string, downloaded: string, target: string): Promise<void> {
  const scriptPath = path.join(os.tmpdir(), `react-launcher-update-${Date.now()}.ps1`);

  fs.writeFileSync(scriptPath, `﻿${REPLACE_SCRIPT}`, 'utf8');

  const commandLine = `powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}" "${oldExe}" "${downloaded}" "${target}"`;

  await runPowerShell(
    `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${quotePs(commandLine)} }; if ($r.ReturnValue -ne 0) { exit 1 }`,
  );
}

async function installUpdate(sender: WebContents): Promise<UpdateInstallResult> {
  if (!pending || installing) {
    return { status: 'error' };
  }

  installing = true;

  const update = pending;
  const portableExe = process.env.PORTABLE_EXECUTABLE_FILE;
  const fileName = decodeURIComponent(path.posix.basename(new URL(update.url).pathname));
  const targetDir = portableExe ? path.dirname(portableExe) : app.getPath('downloads');
  const target = path.join(targetDir, fileName);
  const partial = `${target}.download`;
  const sendProgress = (progress: UpdateProgress) => {
    if (!sender.isDestroyed()) {
      sender.send('update:progress', progress);
    }
  };

  try {
    const hash = await download(update.url, partial, update.size, sendProgress);

    if (hash !== update.sha256) {
      throw new Error('Checksum mismatch');
    }

    if (!portableExe) {
      await fs.promises.rename(partial, target);
      shell.showItemInFolder(target);

      return { status: 'downloaded', path: target };
    }

    await launchReplacement(portableExe, partial, target);
    app.quit();

    return { status: 'restarting' };
  } catch (error) {
    console.error(error);

    try {
      await fs.promises.rm(partial, { force: true });
    } catch {
      // nothing left to clean up
    }

    return { status: 'error' };
  } finally {
    installing = false;
  }
}

export function initUpdater(): void {
  ipcMain.handle('update:check', (): Promise<UpdateCheckResult> => checkForUpdate());
  ipcMain.handle('update:install', (event): Promise<UpdateInstallResult> => installUpdate(event.sender));
}
