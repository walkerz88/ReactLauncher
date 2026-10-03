import type { ContentApp } from '@/electron';

/** A game is ready to launch when its `data` folder has files or `paths.exec` points at an existing exe. */
export const isReadyToLaunch = (app: ContentApp): boolean => app.hasDataFiles || app.hasExec;
