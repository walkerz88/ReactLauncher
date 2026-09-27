/**
 * Things the user does in the launcher that the main process carries out itself (backups, opening a game's
 * installer, stopping a game, …). `content.ts` announces them here and the progress tracker listens, so
 * those achievements are granted from what the main process really did, not from what the window claims.
 */

export type LauncherAction =
  | 'backup-created'
  | 'backup-restored'
  | 'installer-opened'
  | 'settings-opened'
  | 'bonus-opened'
  | 'game-stopped'
  | 'config-saved'
  | 'disk-scan-completed';

const listeners = new Set<(action: LauncherAction) => void>();

export const onLauncherAction = (listener: (action: LauncherAction) => void): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

export const emitLauncherAction = (action: LauncherAction): void => {
  listeners.forEach((listener) => listener(action));
};
