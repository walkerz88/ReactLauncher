import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

export interface PlaytimeEntry {
  /** Total time spent in the game, in seconds. */
  seconds: number;
  /** When the game was last started or closed, ms since epoch. */
  lastPlayedAt: number | null;
}

interface PlaytimeState {
  byId: Record<string, PlaytimeEntry>;
  /** Marks the game as just played (used for launches the main process can't track). */
  recordLaunch: (id: string) => void;
  /** Adds a finished session to the game's total time. */
  addSession: (id: string, seconds: number) => void;
}

const EMPTY_ENTRY: PlaytimeEntry = { seconds: 0, lastPlayedAt: null };

/** Persisted play time and last-played date per game id. */
export const usePlaytimeStore = create<PlaytimeState>()(
  persist(
    (set) => ({
      byId: {},
      recordLaunch: (id) =>
        set((state) => ({
          byId: { ...state.byId, [id]: { ...(state.byId[id] ?? EMPTY_ENTRY), lastPlayedAt: Date.now() } },
        })),
      addSession: (id, seconds) =>
        set((state) => {
          const entry = state.byId[id] ?? EMPTY_ENTRY;

          return {
            byId: { ...state.byId, [id]: { seconds: entry.seconds + Math.max(0, seconds), lastPlayedAt: Date.now() } },
          };
        }),
    }),
    {
      name: 'playtime',
      storage: createJSONStorage(() => profileStorage),
      version: 1,
    },
  ),
);
