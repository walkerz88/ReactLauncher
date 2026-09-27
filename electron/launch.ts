import { execFile, spawn, type ChildProcess } from 'child_process';
import * as path from 'path';

import { BrowserWindow } from 'electron';

/**
 * Some games (e.g. Vampire: The Masquerade – Bloodlines' `Loader.exe`) are started through a small
 * launcher that spawns the real game as its own detached process and then exits itself. If we ended
 * the session the moment our tracked process exits, that would cut the session short right as the
 * real game starts. Instead, once the tracked process exits we check whether another process is still
 * running from the same folder (the game's own executable directory) and, if so, wait for that one too.
 */
const HANDOFF_POLL_MS = 5000;

/** PIDs of running processes whose executable lives under `dir` (case-insensitive, including subfolders). */
const pidsUnder = (dir: string): Promise<number[]> =>
  new Promise((resolve) => {
    const escaped = dir.replace(/'/g, "''");
    const script = `(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith('${escaped}\\', [System.StringComparison]::OrdinalIgnoreCase) }).ProcessId`;

    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], (error, stdout) => {
      if (error) {
        resolve([]);

        return;
      }

      resolve(
        stdout
          .split(/\r?\n/)
          .map((line) => Number(line.trim()))
          .filter((pid) => Number.isInteger(pid) && pid > 0),
      );
    });
  });

/** Waits until no process is running under `dir` anymore, polling every `HANDOFF_POLL_MS`. */
const waitUntilFolderIdle = async (dir: string): Promise<void> => {
  while ((await pidsUnder(dir)).length > 0) {
    await new Promise((resolve) => setTimeout(resolve, HANDOFF_POLL_MS));
  }
};

export interface LaunchOptions {
  args: string[];
}

export interface LaunchResult {
  ok: boolean;
  error?: string;
}

export interface RunningEvent {
  type: 'started' | 'ended';
  id: string;
  /** Session length; present only on `ended`. */
  seconds?: number;
  /** Ids of every game that is running after this event. */
  running: string[];
}

interface RunningGame {
  child: ChildProcess;
  startedAt: number;
  /** The launched executable's own folder, used to detect a hand-off to another process from it (see above). */
  dir: string;
}

const running = new Map<string, RunningGame>();

export const NO_LAUNCH_OPTIONS: LaunchOptions = { args: [] };

type GameEvent = Omit<RunningEvent, 'running'>;

const listeners = new Set<(event: GameEvent) => void>();

/** Main-process subscribers to the same start / exit events the renderer gets (e.g. progress tracking). */
export const onRunningEvent = (listener: (event: GameEvent) => void): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

const emit = (event: GameEvent): void => {
  const payload: RunningEvent = { ...event, running: getRunningIds() };

  listeners.forEach((listener) => listener(event));

  BrowserWindow.getAllWindows().forEach((win) => win.webContents.send('content:running-changed', payload));
};

export const getRunningIds = (): string[] => Array.from(running.keys());

/** Splits a command-line string into arguments, keeping "quoted parts" together. */
export const splitArgs = (input: string): string[] =>
  Array.from(input.matchAll(/"([^"]*)"|(\S+)/g), (match) => match[1] ?? match[2]);

/**
 * Launch a Windows executable. When `id` is given the process is tracked: the renderer is
 * told when it starts and ends (with the session length), and a second launch is refused.
 */
export const launchExecutable = (
  exe: string,
  options: LaunchOptions = NO_LAUNCH_OPTIONS,
  id?: string,
): Promise<LaunchResult> => {
  if (id && running.has(id)) {
    return Promise.resolve({ ok: false, error: 'Игра уже запущена' });
  }

  return new Promise((resolve) => {
    // Old, manifest-less games (Max Payne 1/2, …) trip Windows' UAC installer-detection heuristic:
    // CreateProcess then fails with EACCES because it cannot answer the elevation prompt that
    // Explorer's double-click would. `RunAsInvoker` runs the child at our own integrity level instead.
    const child = spawn(exe, options.args, {
      cwd: path.dirname(exe),
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, __COMPAT_LAYER: 'RunAsInvoker' },
    });

    child.once('error', (err) => {
      console.error('[content] launch failed:', err);
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });

    child.once('spawn', () => {
      child.unref();

      if (id) {
        const dir = path.dirname(exe);

        running.set(id, { child, startedAt: Date.now(), dir });
        emit({ type: 'started', id });

        child.once('exit', () => {
          const game = running.get(id);

          if (game?.child !== child) {
            return;
          }

          // The process we launched exited, but it may have handed off to the real game (see above) — wait
          // for its folder to go quiet before treating the session as over, so the hand-off isn't missed.
          waitUntilFolderIdle(dir).then(() => {
            if (running.get(id) !== game) {
              return;
            }

            running.delete(id);
            emit({ type: 'ended', id, seconds: Math.round((Date.now() - game.startedAt) / 1000) });
          });
        });
      }

      resolve({ ok: true });
    });
  });
};

/** Force-quits a tracked game together with any processes it started — including one it handed off to (see above). */
export const stopGame = async (id: string): Promise<LaunchResult> => {
  const game = running.get(id);

  if (!game) {
    return { ok: false, error: 'Игра не запущена' };
  }

  if (process.platform !== 'win32') {
    game.child.kill();

    return { ok: true };
  }

  const pids = new Set(await pidsUnder(game.dir));

  if (game.child.exitCode === null && game.child.pid) {
    pids.add(game.child.pid);
  }

  if (pids.size === 0) {
    return { ok: false, error: 'Игра не запущена' };
  }

  await Promise.all(
    Array.from(pids, (pid) => new Promise<void>((resolve) => execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => resolve()))),
  );

  return { ok: true };
};
