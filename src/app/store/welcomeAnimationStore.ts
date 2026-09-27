import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';
import {
  DEFAULT_WELCOME_SCENE_VARIANT,
  WELCOME_SCENE_VARIANTS,
  type WelcomeSceneVariant,
} from '@/shared/WelcomeScene';

const isVariant = (value: unknown): value is WelcomeSceneVariant =>
  typeof value === 'string' && (WELCOME_SCENE_VARIANTS as readonly string[]).includes(value);

interface WelcomeAnimationState {
  enabled: boolean;
  variant: WelcomeSceneVariant;
  setEnabled: (enabled: boolean) => void;
  setVariant: (variant: WelcomeSceneVariant) => void;
}

/**
 * Persisted settings of the startup welcome animation (on/off and which one). Same
 * pattern as `themeStore`/`localeStore`: `persist` writes to `localStorage`, which
 * Electron keeps in the app's user-data directory, so the choice survives a restart.
 */
export const useWelcomeAnimationStore = create<WelcomeAnimationState>()(
  persist(
    (set) => ({
      enabled: true,
      variant: DEFAULT_WELCOME_SCENE_VARIANT,
      setEnabled: (enabled) => set({ enabled }),
      setVariant: (variant) => set({ variant }),
    }),
    {
      name: 'welcomeAnimation',
      storage: createJSONStorage(() => profileStorage),
      version: 1,
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<WelcomeAnimationState>;

        return {
          ...current,
          enabled: typeof stored.enabled === 'boolean' ? stored.enabled : current.enabled,
          variant: isVariant(stored.variant) ? stored.variant : current.variant,
        };
      },
    },
  ),
);
