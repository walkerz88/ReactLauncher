import * as path from 'path';

import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';

import { initCapture } from './capture';
import { initContent } from './content';
import { initProfiles } from './profiles';
import { initProgress } from './progressIpc';
import { initSteam } from './steam';
import { initTranslate } from './translate';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

// Disable GPU to prevent crashes on some systems. Must run before `ready`.
app.disableHardwareAcceleration();

// No application menu / menu bar — the app drives navigation from its own sidebar.
Menu.setApplicationMenu(null);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    // Matches the dark theme's `--color-bg` so the window doesn't flash white
    // while the page loads; the inline script in `index.html` corrects this to
    // light if that's the persisted theme.
    backgroundColor: '#15181c',
    // Don't show the window the instant it's created — that left a blank window
    // sitting on screen for as long as the CRA bundle took to load and mount,
    // which is exactly the "big delay" before the welcome animation. Wait for
    // the renderer's first frame instead, so the window appears with the
    // animation already starting.
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // No DevTools in a release build: the renderer's stores can't be edited by hand there.
      devTools: isDev,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // On Windows, `enter-full-screen`/`leave-full-screen` can fire more than once
  // in quick succession while the OS animates the transition, and reading
  // `isFullScreen()` synchronously on each one can catch a stale, oscillating
  // value. Debounce and read the settled state once the transition is done.
  let fullscreenDebounce: NodeJS.Timeout | null = null;
  const emitFullscreen = () => {
    if (fullscreenDebounce) {
      clearTimeout(fullscreenDebounce);
    }
    fullscreenDebounce = setTimeout(() => {
      mainWindow?.webContents.send('window:fullscreen-changed', mainWindow.isFullScreen());
    }, 60);
  };
  mainWindow.on('enter-full-screen', emitFullscreen);
  mainWindow.on('leave-full-screen', emitFullscreen);

  const emitMaximized = () => {
    mainWindow?.webContents.send('window:maximized-changed', mainWindow.isMaximized());
  };
  mainWindow.on('maximize', emitMaximized);
  mainWindow.on('unmaximize', emitMaximized);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const profileFiles = initProfiles();

  if (profileFiles) {
    const progress = initProgress(profileFiles);

    initCapture(profileFiles, progress, () => mainWindow);
  }

  initContent();
  initSteam();
  initTranslate();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('app:quit', () => {
  app.quit();
});

// Only http(s)/mailto links are allowed through — this opens the OS browser or mail client, not the app window.
ipcMain.handle('app:open-external', (_event, url: string) => {
  if (!/^(https?:\/\/|mailto:)/i.test(url)) {
    return;
  }
  shell.openExternal(url);
});

ipcMain.handle('window:is-fullscreen', () => mainWindow?.isFullScreen() ?? false);

ipcMain.handle('window:toggle-fullscreen', () => {
  if (!mainWindow) {
    return false;
  }
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);

  return next;
});

// Custom window controls for the windowed-mode title bar (the window has no OS frame).
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('window:toggle-maximize', () => {
  if (!mainWindow) {
    return false;
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }

  return mainWindow.isMaximized();
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});
