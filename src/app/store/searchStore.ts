import { create } from 'zustand';

interface SearchState {
  /** Search text per `AppCollection` instance (gallery, recent, favourites, …). */
  byContext: Record<string, string>;
  setQuery: (context: string, query: string) => void;
}

/**
 * Keeps the gallery search text while the user is on a game page, so "Back" lands on the same filtered list.
 * Not persisted: it only has to outlive the page, not an app restart.
 */
export const useSearchStore = create<SearchState>()((set) => ({
  byContext: {},
  setQuery: (context, query) => set((state) => ({ byContext: { ...state.byContext, [context]: query } })),
}));
