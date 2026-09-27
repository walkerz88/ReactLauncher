import { BrowserWindow, ipcMain } from 'electron';

import { onRunningEvent } from './launch';
import { onLauncherAction } from './launcherActions';
import type { ProfileFiles } from './profileFiles';
import { createProgress } from './progress';

const STORE_NAME = 'progress';

/**
 * Wires the progress tracker to the profile files, to the game processes (`launch.ts`) and to the renderer.
 * The renderer can ask for the current state and report the few things only it sees — it can't set any number. Call once, after `initProfiles`.
 */
export function initProgress(files: ProfileFiles): ReturnType<typeof createProgress> {
  const send = (channel: string, payload: unknown): void => {
    BrowserWindow.getAllWindows().forEach((win) => win.webContents.send(channel, payload));
  };

  const progress = createProgress(
    {
      getActiveId: files.getActiveId,
      getProfileCreatedAt: files.getProfileCreatedAt,
      read: (profileId) => files.readOwnStore(profileId, STORE_NAME),
      write: (profileId, data) => files.writeOwnStore(profileId, STORE_NAME, data),
    },
    {
      changed: (view) => send('progress:changed', view),
      notify: (notification) => send('progress:notify', notification),
    },
  );

  onRunningEvent((event) => {
    if (event.type === 'started') {
      progress.recordLaunch(event.id);
    } else {
      progress.recordSession(event.id, event.seconds);
    }
  });

  onLauncherAction((action) => progress.recordAction(action));

  ipcMain.handle('progress:get', () => progress.getView());
  ipcMain.handle('progress:event', (_event, kind: unknown, id: unknown) => progress.recordEvent(kind, id));

  return progress;
}
