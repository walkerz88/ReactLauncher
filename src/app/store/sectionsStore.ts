import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

interface SectionsState {
  luckyEnabled: boolean;
  readyEnabled: boolean;
  recentEnabled: boolean;
  favoritesEnabled: boolean;
  addGameEnabled: boolean;
  torrentEnabled: boolean;
  setLuckyEnabled: (enabled: boolean) => void;
  setReadyEnabled: (enabled: boolean) => void;
  setRecentEnabled: (enabled: boolean) => void;
  setFavoritesEnabled: (enabled: boolean) => void;
  setAddGameEnabled: (enabled: boolean) => void;
  setTorrentEnabled: (enabled: boolean) => void;
}

/** Persisted visibility of optional app sections (sidebar entries + their routes). */
export const useSectionsStore = create<SectionsState>()(
  persist(
    (set) => ({
      luckyEnabled: true,
      readyEnabled: true,
      recentEnabled: true,
      favoritesEnabled: true,
      addGameEnabled: true,
      torrentEnabled: true,
      setLuckyEnabled: (luckyEnabled) => set({ luckyEnabled }),
      setReadyEnabled: (readyEnabled) => set({ readyEnabled }),
      setRecentEnabled: (recentEnabled) => set({ recentEnabled }),
      setFavoritesEnabled: (favoritesEnabled) => set({ favoritesEnabled }),
      setAddGameEnabled: (addGameEnabled) => set({ addGameEnabled }),
      setTorrentEnabled: (torrentEnabled) => set({ torrentEnabled }),
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
          readyEnabled: typeof stored.readyEnabled === 'boolean' ? stored.readyEnabled : current.readyEnabled,
          recentEnabled: typeof stored.recentEnabled === 'boolean' ? stored.recentEnabled : current.recentEnabled,
          favoritesEnabled:
            typeof stored.favoritesEnabled === 'boolean' ? stored.favoritesEnabled : current.favoritesEnabled,
          addGameEnabled:
            typeof stored.addGameEnabled === 'boolean' ? stored.addGameEnabled : current.addGameEnabled,
          torrentEnabled:
            typeof stored.torrentEnabled === 'boolean' ? stored.torrentEnabled : current.torrentEnabled,
        };
      },
    },
  ),
);
