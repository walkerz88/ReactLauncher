import { create } from 'zustand';

import type { AppSizes, ContentApp } from '@/electron';

interface LibrarySizesState {
  /** Measured so far, by app id — kept across tab switches (and cancelled scans) so a resumed or
   * revisited scan never re-walks a game it already has a size for. */
  sizes: Record<string, AppSizes>;
  scanning: boolean;
  failed: boolean;
  /** Starts measuring whatever games in `apps` aren't in `sizes` yet — a no-op if a scan is already
   * running or everything is already measured. */
  ensureLoaded: (apps: ContentApp[]) => void;
  /** Abandons an in-progress scan (the health tab was left) instead of letting it keep churning the
   * disk in the background; whatever it already measured stays cached for next time. */
  cancelIfScanning: () => void;
  /** Drops the cached sizes and measures every game again from scratch (e.g. the user just freed up
   * or moved data outside the app and wants the numbers to reflect that). */
  rescan: (apps: ContentApp[]) => void;
}

/** Shared by `ensureLoaded` and `rescan` — measures whatever isn't in `sizes` yet (empty after a
 * rescan clears it), wiring up progress updates and clearing them again once the scan settles. */
const startScan = (
  set: (partial: Partial<LibrarySizesState> | ((state: LibrarySizesState) => Partial<LibrarySizesState>)) => void,
  get: () => LibrarySizesState,
) => {
  const content = window.electronAPI?.content;

  if (!content) {
    return;
  }

  set({ scanning: true, failed: false });
  unsubscribeProgress = content.onSizesProgress(({ id, sizes: appSizes }) => {
    set((state) => ({ sizes: { ...state.sizes, [id]: appSizes } }));
  });

  void (async () => {
    try {
      const result = await content.sizes(Object.keys(get().sizes));

      set((state) => ({ sizes: { ...state.sizes, ...result }, scanning: false }));
    } catch (err) {
      console.error('Measuring the library folders failed:', err);
      set({ failed: true, scanning: false });
    } finally {
      unsubscribeProgress?.();
      unsubscribeProgress = null;
    }
  })();
};

/** Unsubscribes the current progress listener, if any — module-scoped since it's not part of the
 * state itself, just IPC plumbing for whichever scan is active. */
let unsubscribeProgress: (() => void) | null = null;

export const useLibrarySizesStore = create<LibrarySizesState>((set, get) => ({
  sizes: {},
  scanning: false,
  failed: false,

  ensureLoaded: (apps) => {
    const { scanning, sizes } = get();

    if (scanning || !window.electronAPI?.content || apps.every((app) => app.id in sizes)) {
      return;
    }

    startScan(set, get);
  },

  cancelIfScanning: () => {
    if (!get().scanning) {
      return;
    }

    window.electronAPI?.content.cancelSizes();
    unsubscribeProgress?.();
    unsubscribeProgress = null;
    set({ scanning: false });
  },

  rescan: (apps) => {
    if (apps.length === 0 || !window.electronAPI?.content) {
      return;
    }

    get().cancelIfScanning();
    set({ sizes: {} });
    startScan(set, get);
  },
}));
