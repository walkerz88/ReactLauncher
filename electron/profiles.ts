import * as fs from 'fs';
import * as path from 'path';

import { app, dialog, ipcMain } from 'electron';

import { createSealer } from './profileCrypto';
import { createProfileFiles, type ProfileFiles, type ProfileSnapshot } from './profileFiles';

const EMPTY_SNAPSHOT: ProfileSnapshot = { index: { profiles: [], activeId: null }, stores: {} };

const KEY_VAR = 'PROFILE_ENCRYPTION_KEY';
const KEY_BYTES = 32;

/** `NAME=value` lines of a `.env` file: enough for the one variable read here (`#` comments, optional quotes). */
const parseEnvFile = (content: string): Record<string, string> =>
  Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');

        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, '$2')];
      }),
  );

/**
 * The encryption key of the profile files comes from the project's `.env` (`PROFILE_ENCRYPTION_KEY`, base64 of
 * 32 bytes), which is packed into the build. It is not tied to an OS user or machine, so the same build (or
 * the same `.env`) opens the same profile files anywhere — copy the files and they work. The flip side: the key
 * ships inside the app, so this stops hand-editing of the files, not someone who digs the key out of the build.
 * A variable set in the environment wins over the file.
 */
const loadKey = (): Buffer => {
  let fromFile: string | undefined;

  try {
    fromFile = parseEnvFile(fs.readFileSync(path.join(app.getAppPath(), '.env'), 'utf-8'))[KEY_VAR];
  } catch {
    // no .env: only the environment can provide the key
  }

  const key = Buffer.from(process.env[KEY_VAR] ?? fromFile ?? '', 'base64');

  if (key.length !== KEY_BYTES) {
    throw new Error(`${KEY_VAR} is missing or is not a base64-encoded 32-byte key. Copy .env.example to .env and set it.`);
  }

  return key;
};

/**
 * `data/profiles/` next to the program, so a profile travels with the app folder:
 *   portable build:   the folder the portable .exe was started from
 *   installed build:  the folder of the .exe
 *   development:      the project root
 */
export const profilesDir = (): string => {
  const baseDir = process.env.PORTABLE_EXECUTABLE_DIR ?? (app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath());

  return path.join(baseDir, 'data', 'profiles');
};

/**
 * The renderer reads its snapshot synchronously at startup (its persisted stores are created before any
 * async call could return) and writes changes back over IPC.
 * Call once, after `app` is ready and before the window is created.
 */
export function initProfiles(): ProfileFiles | null {
  let files: ProfileFiles;

  try {
    files = createProfileFiles(profilesDir(), createSealer(loadKey()));
  } catch (err) {
    dialog.showErrorBox('Профили недоступны / Profiles unavailable', err instanceof Error ? err.message : String(err));
    app.exit(1);

    return null;
  }

  ipcMain.on('profiles:load-sync', (event) => {
    try {
      event.returnValue = files.loadSnapshot();
    } catch (err) {
      console.error('[profiles] load failed:', err);
      event.returnValue = EMPTY_SNAPSHOT;
    }
  });

  ipcMain.handle('profiles:save-store', (_event, id: unknown, name: unknown, value: unknown) =>
    files.saveStore(id, name, value),
  );
  ipcMain.handle('profiles:create', (_event, profile: unknown, stores: unknown) =>
    files.createProfile(profile, stores),
  );
  ipcMain.handle('profiles:switch', (_event, id: unknown) => files.switchProfile(id));
  ipcMain.handle('profiles:rename', (_event, id: unknown, name: unknown) => files.renameProfile(id, name));
  ipcMain.handle('profiles:delete', (_event, id: unknown) => files.deleteProfile(id));

  return files;
}
