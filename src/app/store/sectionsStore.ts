import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

interface SectionsState {
  luckyEnabled: boolean;
  readyEnabled: boolean;
  installableEnabled: boolean;
  recentEnabled: boolean;
  favoritesEnabled: boolean;
  addGameEnabled: boolean;
  torrentEnabled: boolean;
  showCounts: boolean;
  setLuckyEnabled: (enabled: boolean) => void;
  setReadyEnabled: (enabled: boolean) => void;
  setInstallableEnabled: (enabled: boolean) => void;
  setRecentEnabled: (enabled: boolean) => void;
  setFavoritesEnabled: (enabled: boolean) => void;
  setAddGameEnabled: (enabled: boolean) => void;
  setTorrentEnabled: (enabled: boolean) => void;
  setShowCounts: (show: boolean) => void;
}

/** Persisted visibility of optional app sections (sidebar entries + their routes). */
export const useSectionsStore = create<SectionsState>()(
  persist(
    (set) => ({
      luckyEnabled: true,
      readyEnabled: true,
      installableEnabled: true,
      recentEnabled: true,
      favoritesEnabled: true,
      addGameEnabled: true,
      torrentEnabled: true,
      showCounts: true,
      setLuckyEnabled: (luckyEnabled) => set({ luckyEnabled }),
      setReadyEnabled: (readyEnabled) => set({ readyEnabled }),
      setInstallableEnabled: (installableEnabled) => set({ installableEnabled }),
      setRecentEnabled: (recentEnabled) => set({ recentEnabled }),
      setFavoritesEnabled: (favoritesEnabled) => set({ favoritesEnabled }),
      setAddGameEnabled: (addGameEnabled) => set({ addGameEnabled }),
      setTorrentEnabled: (torrentEnabled) => set({ torrentEnabled }),
      setShowCounts: (showCounts) => set({ showCounts }),
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
          installableEnabled:
            typeof stored.installableEnabled === 'boolean' ? stored.installableEnabled : current.installableEnabled,
          recentEnabled: typeof stored.recentEnabled === 'boolean' ? stored.recentEnabled : current.recentEnabled,
          favoritesEnabled:
            typeof stored.favoritesEnabled === 'boolean' ? stored.favoritesEnabled : current.favoritesEnabled,
          addGameEnabled:
            typeof stored.addGameEnabled === 'boolean' ? stored.addGameEnabled : current.addGameEnabled,
          torrentEnabled:
            typeof stored.torrentEnabled === 'boolean' ? stored.torrentEnabled : current.torrentEnabled,
          showCounts: typeof stored.showCounts === 'boolean' ? stored.showCounts : current.showCounts,
        };
      },
    },
  ),
);
