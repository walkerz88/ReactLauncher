import * as fs from 'fs';
import * as path from 'path';

import { app, ipcMain } from 'electron';

interface AppSettings {
  launchFullscreen: boolean;
  launchAtLogin: boolean;
}

const DEFAULTS: AppSettings = { launchFullscreen: true, launchAtLogin: false };

/**
 * Machine-level launch settings kept next to the app's user data, not in a profile: the window is created
 * (and the login item registered) before any profile is read, and autostart belongs to the machine anyway.
 */
let settings: AppSettings = { ...DEFAULTS };

const settingsFile = (): string => path.join(app.getPath('userData'), 'launcher-settings.json');

function loadSettings(): AppSettings {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFile(), 'utf-8')) as Partial<AppSettings>;

    return {
      launchFullscreen:
        typeof parsed.launchFullscreen === 'boolean' ? parsed.launchFullscreen : DEFAULTS.launchFullscreen,
      launchAtLogin: typeof parsed.launchAtLogin === 'boolean' ? parsed.launchAtLogin : DEFAULTS.launchAtLogin,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(): void {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[settings] save failed:', err);
  }
}

/** The portable build runs from a temp-unpacked copy, so the real launcher file is the one to autostart. */
const loginItemPath = (): string => process.env.PORTABLE_EXECUTABLE_FILE ?? process.execPath;

/** Dev would register the bare `electron.exe`; only a packaged build is ever put into autostart. */
function applyLaunchAtLogin(): void {
  if (!app.isPackaged) {
    return;
  }

  try {
    app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, path: loginItemPath() });
  } catch (err) {
    console.error('[settings] login item failed:', err);
  }
}

export const getLaunchFullscreen = (): boolean => settings.launchFullscreen;

/**
 * Call once, after `app` is ready and before the window is created. The login item is re-applied on every
 * start because an update replaces the portable exe under a new name, which would leave the old entry dangling.
 */
export function initAppSettings(): void {
  settings = loadSettings();
  applyLaunchAtLogin();

  ipcMain.handle('settings:get', (): AppSettings => settings);

  ipcMain.handle('settings:set', (_event, patch: unknown): AppSettings => {
    const next = (patch ?? {}) as Partial<AppSettings>;

    if (typeof next.launchFullscreen === 'boolean') {
      settings.launchFullscreen = next.launchFullscreen;
    }
    if (typeof next.launchAtLogin === 'boolean') {
      settings.launchAtLogin = next.launchAtLogin;
    }

    saveSettings();
    applyLaunchAtLogin();

    return settings;
  });
}
