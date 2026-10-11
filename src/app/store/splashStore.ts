import { create } from 'zustand';

interface SplashState {
  /** The welcome animation is over (or was never shown), so other startup prompts may appear. */
  done: boolean;
  setDone: () => void;
}

export const useSplashStore = create<SplashState>()((set) => ({
  done: false,
  setDone: () => set({ done: true }),
}));
