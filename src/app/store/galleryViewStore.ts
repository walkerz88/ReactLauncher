import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { profileStorage } from "@/app/lib/profile";
import { GALLERY_SORT_MODES, type GallerySortMode } from "@/app/lib/sortApps";
import type { GalleryViewMode } from "@/widgets/GalleryControls";

interface GalleryViewEntry {
  viewMode: GalleryViewMode;
  genreFilter: string | null;
  seriesFilter: string | null;
  sortMode: GallerySortMode;
}

// A stable singleton, not built fresh per call: this is used directly as a zustand selector's
// fallback (`AppCollection.tsx` via `getGalleryViewEntry`), and a fresh object on every call would
// never compare equal to itself across renders — `useSyncExternalStore` would treat that as the
// store changing on every read, which is an infinite render loop (crashes the whole app).
const DEFAULT_ENTRY: GalleryViewEntry = {
  viewMode: "flat",
  genreFilter: null,
  seriesFilter: null,
  sortMode: "rating",
};

// Same stability requirement as `DEFAULT_ENTRY` above: a singleton, not built per call.
const DEFAULT_ENTRY_RECENT: GalleryViewEntry = {
  ...DEFAULT_ENTRY,
  sortMode: "lastPlayed",
};

const defaultEntryFor = (context: string): GalleryViewEntry => (context === "recent" ? DEFAULT_ENTRY_RECENT : DEFAULT_ENTRY);

interface GalleryViewState {
  /** View mode + filters per `AppCollection` instance (gallery, recent, favourites, …). */
  byContext: Record<string, GalleryViewEntry>;
  setViewMode: (context: string, viewMode: GalleryViewMode) => void;
  setGenreFilter: (context: string, genreFilter: string | null) => void;
  setSeriesFilter: (context: string, seriesFilter: string | null) => void;
  setSortMode: (context: string, sortMode: GallerySortMode) => void;
  resetFilters: (context: string) => void;
}

/**
 * Persisted view mode + genre/series filters, keyed by the `AppCollection`
 * instance that owns them (gallery, recently-launched, favourites, …) so
 * switching tabs doesn't mix them up. Like `favoritesStore`, `persist` writes
 * to `localStorage`, which Electron keeps in the user-data directory, so the
 * choice survives an app restart.
 */
export const useGalleryViewStore = create<GalleryViewState>()(
  persist(
    (set) => ({
      byContext: {},
      setViewMode: (context, viewMode) =>
        set((state) => ({
          byContext: {
            ...state.byContext,
            [context]: { ...(state.byContext[context] ?? defaultEntryFor(context)), viewMode },
          },
        })),
      setGenreFilter: (context, genreFilter) =>
        set((state) => ({
          byContext: {
            ...state.byContext,
            [context]: { ...(state.byContext[context] ?? defaultEntryFor(context)), genreFilter },
          },
        })),
      setSeriesFilter: (context, seriesFilter) =>
        set((state) => ({
          byContext: {
            ...state.byContext,
            [context]: { ...(state.byContext[context] ?? defaultEntryFor(context)), seriesFilter },
          },
        })),
      setSortMode: (context, sortMode) =>
        set((state) => ({
          byContext: {
            ...state.byContext,
            [context]: { ...(state.byContext[context] ?? defaultEntryFor(context)), sortMode },
          },
        })),
      resetFilters: (context) =>
        set((state) => ({
          byContext: {
            ...state.byContext,
            [context]: {
              ...(state.byContext[context] ?? defaultEntryFor(context)),
              genreFilter: null,
              seriesFilter: null,
            },
          },
        })),
    }),
    {
      name: "galleryView",
      storage: createJSONStorage(() => profileStorage),
      version: 1,
      // Entries saved before sorting existed lack `sortMode`. They are completed here, once, rather than
      // in `getGalleryViewEntry`: that runs inside a store selector, and returning a fresh object from
      // a selector makes React re-render forever.
      merge: (persisted, current) => {
        const stored = (persisted as { byContext?: Record<string, Partial<GalleryViewEntry>> } | undefined)?.byContext ?? {};
        const byContext = Object.fromEntries(
          Object.entries(stored).map(([context, entry]) => [
            context,
            {
              ...defaultEntryFor(context),
              ...entry,
              // "default" used to be a choice for the "recent" tab; it's gone, so any old entry
              // still carrying it (or anything else no longer valid) falls back to this context's default.
              sortMode: GALLERY_SORT_MODES.find((mode) => mode === entry.sortMode) ?? defaultEntryFor(context).sortMode,
            },
          ]),
        );

        return { ...current, byContext };
      },
    },
  ),
);

export const getGalleryViewEntry = (
  byContext: Record<string, GalleryViewEntry>,
  context: string,
): GalleryViewEntry => byContext[context] ?? defaultEntryFor(context);
