import { create } from 'zustand';

import type { UpdateCheckResult, UpdateInfo, UpdateInstallResult } from '@/electron';

interface UpdateState {
  /** `null` until the first check answers; `false` when the build has no `updates.manifestUrl`. */
  enabled: boolean | null;
  update: UpdateInfo | null;
  modalOpen: boolean;
  installing: boolean;
  /** Why the last install failed, for the error toast. */
  installError: string | null;
  /** Bytes downloaded and the file size (0 if unknown) while `installing`. */
  progress: { received: number; total: number };
  check: () => Promise<UpdateCheckResult['status']>;
  openModal: () => void;
  closeModal: () => void;
  install: () => Promise<UpdateInstallResult['status']>;
}

export const useUpdateStore = create<UpdateState>()((set) => ({
  enabled: null,
  update: null,
  modalOpen: false,
  installing: false,
  installError: null,
  progress: { received: 0, total: 0 },
  check: async () => {
    try {
      const result = await window.electronAPI.update.check();

      set({
        enabled: result.status !== 'disabled',
        update: result.status === 'available' ? result.update : null,
      });

      return result.status;
    } catch (err) {
      console.error(err);

      return 'error';
    }
  },
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
  install: async () => {
    const unsubscribe = window.electronAPI.update.onProgress((progress) => set({ progress }));

    set({ installing: true, installError: null, progress: { received: 0, total: 0 } });

    try {
      const result = await window.electronAPI.update.install();

      if (result.status !== 'restarting') {
        set({ installing: false, installError: result.status === 'error' ? result.reason : null });
      }

      return result.status;
    } catch (err) {
      console.error(err);
      set({ installing: false, installError: err instanceof Error ? err.message : String(err) });

      return 'error';
    } finally {
      unsubscribe();
    }
  },
}));
