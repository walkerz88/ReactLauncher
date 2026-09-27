import { create } from 'zustand';

interface LuckyState {
  /** App ids in the shuffled reel order, or `null` before the first visit. */
  order: string[] | null;
  /** Wrapped index of the tile resting in the center, or `null` until the reel has been centered. */
  centerIndex: number | null;
  revealed: boolean;
  winnerId: string | null;
  save: (patch: Partial<Omit<LuckyState, 'save' | 'resetFor'>>) => void;
  /** Start over with a new reel order (first visit, or the library changed). */
  resetFor: (order: string[]) => void;
}

/**
 * Session-only (deliberately not persisted) memory of the "Feeling Lucky" reel, so
 * coming back to the page — e.g. via "Back" from an app page — shows the same reel
 * instead of a fresh shuffle.
 */
export const useLuckyStore = create<LuckyState>()((set) => ({
  order: null,
  centerIndex: null,
  revealed: false,
  winnerId: null,
  save: (patch) => set(patch),
  resetFor: (order) => set({ order, centerIndex: null, revealed: false, winnerId: null }),
}));
