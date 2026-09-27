import { create } from 'zustand';

interface RunningState {
  /** Ids of the games running right now (kept in sync by `useRunningGamesSync`). */
  ids: string[];
  setIds: (ids: string[]) => void;
}

export const useRunningStore = create<RunningState>()((set) => ({
  ids: [],
  setIds: (ids) => set({ ids }),
}));
