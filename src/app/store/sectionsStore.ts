import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

interface SectionsState {
  luckyEnabled: boolean;
  setLuckyEnabled: (enabled: boolean) => void;
}

/** Persisted visibility of optional app sections (sidebar entries + their routes). */
export const useSectionsStore = create<SectionsState>()(
  persist(
    (set) => ({
      luckyEnabled: true,
      setLuckyEnabled: (luckyEnabled) => set({ luckyEnabled }),
    }),
    {
      name: 'sections',
      storage: createJSONStorage(() => profileStorage),
      version: 1,
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<SectionsState>;

        return {
          ...current,
          luckyEnabled: typeof stored.luckyEnabled === 'boolean' ? stored.luckyEnabled : current.luckyEnabled,
        };
      },
    },
  ),
);
