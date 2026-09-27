import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

/** The startup snapshot is read once: the persisted stores and `index.html`'s boot script both ask for it. */
let profileSnapshot: unknown;

const electronAPI = {
  quit: (): Promise<void> => ipcRenderer.invoke('app:quit'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:open-external', url),
  window: {
    isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:is-fullscreen'),
    toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggle-fullscreen'),
    /** Also fires for F11 / other OS-driven toggles, not just our own button. */
    onFullscreenChange: (callback: (isFullscreen: boolean) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, isFullscreen: boolean) => callback(isFullscreen);
      ipcRenderer.on('window:fullscreen-changed', listener);

      return () => ipcRenderer.removeListener('window:fullscreen-changed', listener);
    },
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    toggleMaximize: (): Promise<boolean> => ipcRenderer.invoke('window:toggle-maximize'),
    onMaximizedChange: (callback: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
      ipcRenderer.on('window:maximized-changed', listener);

      return () => ipcRenderer.removeListener('window:maximized-changed', listener);
    },
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
  },
  steam: {
    search: (term: string) => ipcRenderer.invoke('steam:search', term),
    info: (steamAppId: string) => ipcRenderer.invoke('steam:info', steamAppId),
  },
  profiles: {
    loadSync: (): unknown => {
      profileSnapshot ??= ipcRenderer.sendSync('profiles:load-sync');

      return profileSnapshot;
    },
    saveStore: (id: string, name: string, value: string) => ipcRenderer.invoke('profiles:save-store', id, name, value),
    create: (profile: unknown, stores: unknown) => ipcRenderer.invoke('profiles:create', profile, stores),
    switch: (id: string) => ipcRenderer.invoke('profiles:switch', id),
    rename: (id: string, name: string) => ipcRenderer.invoke('profiles:rename', id, name),
    remove: (id: string) => ipcRenderer.invoke('profiles:delete', id),
  },
  progress: {
    get: () => ipcRenderer.invoke('progress:get'),
    event: (kind: string, id: string) => ipcRenderer.invoke('progress:event', kind, id),
    onChanged: (callback: (view: unknown) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, view: unknown) => callback(view);
      ipcRenderer.on('progress:changed', listener);

      return () => ipcRenderer.removeListener('progress:changed', listener);
    },
    onNotify: (callback: (notification: unknown) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, notification: unknown) => callback(notification);
      ipcRenderer.on('progress:notify', listener);

      return () => ipcRenderer.removeListener('progress:notify', listener);
    },
  },
  content: {
    list: () => ipcRenderer.invoke('content:list'),
    launch: (id: string) => ipcRenderer.invoke('content:launch', id),
    openSettings: (id: string) => ipcRenderer.invoke('content:open-settings', id),
    openInstaller: (id: string) => ipcRenderer.invoke('content:open-installer', id),
    openData: (id: string) => ipcRenderer.invoke('content:open-data', id),
    openAppFolder: (id: string) => ipcRenderer.invoke('content:open-app-folder', id),
    openBonus: (id: string) => ipcRenderer.invoke('content:open-bonus', id),
    diskSpace: () => ipcRenderer.invoke('content:disk-space'),
    sizes: (skipIds?: string[]) => ipcRenderer.invoke('content:sizes', skipIds ?? []),
    cancelSizes: () => ipcRenderer.send('content:sizes-cancel'),
    onSizesProgress: (callback: (event: unknown) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload);
      ipcRenderer.on('content:sizes-progress', listener);

      return () => ipcRenderer.removeListener('content:sizes-progress', listener);
    },
    folderName: (title: string) => ipcRenderer.invoke('content:folder-name', title),
    stop: (id: string) => ipcRenderer.invoke('content:stop', id),
    running: () => ipcRenderer.invoke('content:running'),
    onRunningChanged: (callback: (event: unknown) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload);
      ipcRenderer.on('content:running-changed', listener);

      return () => ipcRenderer.removeListener('content:running-changed', listener);
    },
    backupList: (id: string) => ipcRenderer.invoke('content:backup-list', id),
    backupCreate: (id: string) => ipcRenderer.invoke('content:backup-create', id),
    backupRestore: (id: string, name: string) => ipcRenderer.invoke('content:backup-restore', id, name),
    backupDelete: (id: string, name: string) => ipcRenderer.invoke('content:backup-delete', id, name),
    backupOpen: (id: string) => ipcRenderer.invoke('content:backup-open', id),
    createApp: (title: string, config: unknown) =>
      ipcRenderer.invoke('content:create-app', title, config),
    downloadSteamAssets: (id: string, steamAppId: string, options?: unknown) =>
      ipcRenderer.invoke('content:download-steam-assets', id, steamAppId, options),
    readConfig: (id: string) => ipcRenderer.invoke('content:read-config', id),
    writeConfig: (id: string, config: unknown) =>
      ipcRenderer.invoke('content:write-config', id, config),
    pickPath: (id: string, field: string, mode?: string) =>
      ipcRenderer.invoke('content:pick-path', id, field, mode),
  },
  capture: {
    list: (gameId: string) => ipcRenderer.invoke('capture:list', gameId),
    saveRecording: (gameId: string, bytes: ArrayBuffer) => ipcRenderer.invoke('capture:save-recording', gameId, bytes),
    delete: (url: string) => ipcRenderer.invoke('capture:delete', url),
    reveal: (url: string) => ipcRenderer.invoke('capture:reveal', url),
    onScreenshotTaken: (callback: (event: { gameId: string }) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: { gameId: string }) => callback(payload);
      ipcRenderer.on('capture:screenshot-taken', listener);

      return () => ipcRenderer.removeListener('capture:screenshot-taken', listener);
    },
    onRecordingSaved: (callback: (event: { gameId: string }) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: { gameId: string }) => callback(payload);
      ipcRenderer.on('capture:recording-saved', listener);

      return () => ipcRenderer.removeListener('capture:recording-saved', listener);
    },
    onStartRecording: (callback: (event: { gameId: string; sourceId: string; maxSeconds: number }) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: { gameId: string; sourceId: string; maxSeconds: number }) => callback(payload);
      ipcRenderer.on('capture:start-recording', listener);

      return () => ipcRenderer.removeListener('capture:start-recording', listener);
    },
    onStopRecording: (callback: () => void): (() => void) => {
      const listener = () => callback();
      ipcRenderer.on('capture:stop-recording', listener);

      return () => ipcRenderer.removeListener('capture:stop-recording', listener);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
