import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { profileStorage } from "@/app/lib/profile";

const MAX_RECENT = 12;

interface RecentState {
  /** Ids of recently launched apps, most recent first, deduped. */
  ids: string[];
  /** Record a successful launch, moving `id` to the front. */
  recordLaunch: (id: string) => void;
  /** Clear the list (e.g. the "Recently launched" tab hides itself once empty). */
  clear: () => void;
}

/**
 * Persisted "recently launched" list. Like the favourites store, `persist`
 * writes to `localStorage`, which Electron keeps in the user-data directory,
 * so it survives a restart.
 */
export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      recordLaunch: (id) =>
        set((state) => ({
          ids: [id, ...state.ids.filter((entry) => entry !== id)].slice(0, MAX_RECENT),
        })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: "recent",
      storage: createJSONStorage(() => profileStorage),
      version: 1,
    },
  ),
);
