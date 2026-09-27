import { create } from 'zustand';

import type { ProfileMeta } from '@/electron';
import {
  clearLegacyStores,
  getInitialProfileIndex,
  profilesApi,
  readLegacyStores,
  skipSplashOnNextStart,
} from '@/app/lib/profile';

export const MAX_PROFILE_NAME_LENGTH = 30;

export type Profile = ProfileMeta;

interface ProfileState {
  profiles: Profile[];
  /** Id of the profile the per-profile stores were loaded for. */
  activeId: string | null;
  /** Adds a profile and switches to it. */
  createProfile: (name: string) => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

/** The per-profile stores are hydrated once, at startup, so changing the active profile means a reload. */
const reloadApp = (): void => {
  window.location.reload();
};

const createId = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * The list of profiles. It is kept on disk by the main process (`electron/profiles.ts`); this store
 * mirrors it and asks the main process to change it.
 */
export const useProfileStore = create<ProfileState>()((set, get) => ({
  profiles: getInitialProfileIndex().profiles,
  activeId: getInitialProfileIndex().activeId,

  createProfile: async (name) => {
    const isFirst = get().profiles.length === 0;
    const profile: Profile = {
      id: createId(),
      name: name.trim().slice(0, MAX_PROFILE_NAME_LENGTH),
      createdAt: Date.now(),
    };

    try {
      // The very first profile takes over what the app collected before profiles existed.
      await profilesApi.create(profile, isFirst ? readLegacyStores() : {});

      if (isFirst) {
        clearLegacyStores();
        skipSplashOnNextStart();
      }

      reloadApp();
    } catch (err) {
      console.error('Creating the profile failed:', err);
    }
  },

  switchProfile: async (id) => {
    if (id === get().activeId) {
      return;
    }

    try {
      await profilesApi.switch(id);
      reloadApp();
    } catch (err) {
      console.error('Switching the profile failed:', err);
    }
  },

  renameProfile: async (id, name) => {
    try {
      const index = await profilesApi.rename(id, name);

      set({ profiles: index.profiles });
    } catch (err) {
      console.error('Renaming the profile failed:', err);
    }
  },

  deleteProfile: async (id) => {
    try {
      const index = await profilesApi.remove(id);

      if (id === get().activeId) {
        reloadApp();

        return;
      }

      set({ profiles: index.profiles });
    } catch (err) {
      console.error('Deleting the profile failed:', err);
    }
  },
}));
