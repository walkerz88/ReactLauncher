import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { profileStorage } from "@/app/lib/profile";

interface FavoritesState {
  /** Ids of apps marked as favourite, in the order they were added. */
  ids: string[];
  toggle: (id: string) => void;
}

/**
 * Persisted favourites. Like the theme store, `persist` writes to `localStorage`,
 * which Electron keeps in the user-data directory, so favourites survive a restart.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((entry) => entry !== id)
            : [...state.ids, id],
        })),
    }),
    {
      name: "favorites",
      storage: createJSONStorage(() => profileStorage),
      version: 1,
    },
  ),
);
