import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

interface SoundState {
  achievementSoundEnabled: boolean;
  setAchievementSoundEnabled: (enabled: boolean) => void;
}

/** Persisted sound settings. Same pattern as the other small settings stores. */
export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      achievementSoundEnabled: true,
      setAchievementSoundEnabled: (achievementSoundEnabled) => set({ achievementSoundEnabled }),
    }),
    {
      name: 'sound',
      storage: createJSONStorage(() => profileStorage),
      version: 1,
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<SoundState>;

        return {
          ...current,
          achievementSoundEnabled:
            typeof stored.achievementSoundEnabled === 'boolean' ? stored.achievementSoundEnabled : current.achievementSoundEnabled,
        };
      },
    },
  ),
);
