import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

interface CardsState {
  /** Tilt, parallax and glare of a gallery card's cover on hover. */
  animateOnHover: boolean;
  /** Plays the game's trailer over the cover after a short hover. */
  previewTrailer: boolean;
  setAnimateOnHover: (value: boolean) => void;
  setPreviewTrailer: (value: boolean) => void;
}

/** Persisted gallery-card settings. Same pattern as the other stores: `persist` keeps them in `localStorage`. */
export const useCardsStore = create<CardsState>()(
  persist(
    (set) => ({
      animateOnHover: true,
      previewTrailer: true,
      setAnimateOnHover: (animateOnHover) => set({ animateOnHover }),
      setPreviewTrailer: (previewTrailer) => set({ previewTrailer }),
    }),
    {
      name: 'cards',
      storage: createJSONStorage(() => profileStorage),
      version: 1,
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<CardsState>;

        return {
          ...current,
          animateOnHover: typeof stored.animateOnHover === 'boolean' ? stored.animateOnHover : current.animateOnHover,
          previewTrailer: typeof stored.previewTrailer === 'boolean' ? stored.previewTrailer : current.previewTrailer,
        };
      },
    },
  ),
);
