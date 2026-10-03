import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

interface SoundState {
  achievementSoundEnabled: boolean;
  screenshotSoundEnabled: boolean;
  recordingSoundEnabled: boolean;
  setAchievementSoundEnabled: (enabled: boolean) => void;
  setScreenshotSoundEnabled: (enabled: boolean) => void;
  setRecordingSoundEnabled: (enabled: boolean) => void;
}

/** Persisted sound settings. Same pattern as the other small settings stores. */
export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      achievementSoundEnabled: true,
      screenshotSoundEnabled: true,
      recordingSoundEnabled: true,
      setAchievementSoundEnabled: (achievementSoundEnabled) => set({ achievementSoundEnabled }),
      setScreenshotSoundEnabled: (screenshotSoundEnabled) => set({ screenshotSoundEnabled }),
      setRecordingSoundEnabled: (recordingSoundEnabled) => set({ recordingSoundEnabled }),
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
          screenshotSoundEnabled:
            typeof stored.screenshotSoundEnabled === 'boolean' ? stored.screenshotSoundEnabled : current.screenshotSoundEnabled,
          recordingSoundEnabled:
            typeof stored.recordingSoundEnabled === 'boolean' ? stored.recordingSoundEnabled : current.recordingSoundEnabled,
        };
      },
    },
  ),
);
