import { BrowserWindow, screen } from 'electron';

/**
 * A best-effort on-screen overlay for the screenshot/recording hotkeys (`capture.ts`): a toast
 * ("Screenshot saved") and a recording indicator, drawn above whatever is on screen. It never loads
 * remote or user content — only the inline HTML below — so it's given `nodeIntegration` directly
 * instead of a second preload bundle, which would be a lot of build wiring for one tiny page.
 *
 * This is explicitly best-effort: a game running in exclusive fullscreen owns the whole display
 * output and this window simply won't be visible over it, the same limitation overlays like Steam's
 * work around with a render-pipeline injection this project doesn't attempt.
 */

const OVERLAY_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  body { font-family: system-ui, sans-serif; }
  .toast {
    position: fixed;
    top: 24px;
    right: 24px;
    padding: 10px 16px;
    border-radius: 10px;
    background: rgba(20, 20, 24, 0.85);
    color: #fff;
    font-size: 14px;
    opacity: 0;
    transform: translateY(-8px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .toast--visible { opacity: 1; transform: translateY(0); }
  .recording {
    position: fixed;
    /* Stacked under the toast, same corner, rather than the opposite side — both can be on
     * screen at once (e.g. a toast right after stopping a recording). */
    top: 70px;
    right: 24px;
    display: none;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 10px;
    background: rgba(20, 20, 24, 0.85);
    color: #fff;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .recording--visible { display: flex; }
  .recording__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #e53e3e;
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
</style>
</head>
<body>
  <div class="toast" id="toast"></div>
  <div class="recording" id="recording"><span class="recording__dot"></span><span id="recording-time"></span></div>
  <script>
    const { ipcRenderer } = require('electron');

    const toastEl = document.getElementById('toast');
    let toastTimer = null;

    ipcRenderer.on('overlay:toast', (_event, text) => {
      toastEl.textContent = text;
      toastEl.classList.add('toast--visible');
      if (toastTimer) {
        clearTimeout(toastTimer);
      }
      toastTimer = setTimeout(() => toastEl.classList.remove('toast--visible'), 2000);
    });

    const recordingEl = document.getElementById('recording');
    const recordingTimeEl = document.getElementById('recording-time');
    let recordingTicker = null;

    ipcRenderer.on('overlay:recording', (_event, payload) => {
      if (recordingTicker) {
        clearInterval(recordingTicker);
        recordingTicker = null;
      }

      if (!payload || !payload.active) {
        recordingEl.classList.remove('recording--visible');
        return;
      }

      const maxSeconds = payload.maxSeconds;
      const startedAt = Date.now();
      const tick = () => {
        const elapsed = Math.min(maxSeconds, Math.floor((Date.now() - startedAt) / 1000));
        recordingTimeEl.textContent = elapsed + ' / ' + maxSeconds + 's';
      };

      tick();
      recordingTicker = setInterval(tick, 250);
      recordingEl.classList.add('recording--visible');
    });
  </script>
</body>
</html>`;

let overlayWindow: BrowserWindow | null = null;

const getOverlayWindow = (): BrowserWindow => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  const { bounds } = screen.getPrimaryDisplay();

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(OVERLAY_HTML)}`);
  overlayWindow.once('ready-to-show', () => overlayWindow?.showInactive());
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
};

export const showOverlayToast = (text: string): void => {
  try {
    getOverlayWindow().webContents.send('overlay:toast', text);
  } catch (err) {
    console.error('[overlay] toast failed:', err);
  }
};

export const setOverlayRecordingState = (active: boolean, maxSeconds?: number): void => {
  try {
    getOverlayWindow().webContents.send('overlay:recording', { active, maxSeconds });
  } catch (err) {
    console.error('[overlay] recording state failed:', err);
  }
};
