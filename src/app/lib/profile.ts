import type { StateStorage } from 'zustand/middleware';

import type { ProfileIndex, ProfilesAPI, ProfileSnapshot } from '@/electron';
import { storageKey } from '@/app/lib/storage';

/** Names of the persisted stores whose data is kept per profile: statistics as well as every setting. */
export const PROFILE_STORE_NAMES = [
  'playtime',
  'recent',
  'favorites',
  'theme',
  'locale',
  'welcomeAnimation',
  'cards',
  'sections',
  'galleryView',
] as const;

/** Outside Electron (plain browser during development) there is no disk to write to: profiles last until the reload. */
const createMemoryProfiles = (): ProfilesAPI => {
  let index: ProfileIndex = { profiles: [], activeId: null };
  const stores: Record<string, Record<string, string>> = {};

  return {
    loadSync: () => ({ index, stores: { ...(index.activeId ? stores[index.activeId] : undefined) } }),
    saveStore: async (id, name, value) => {
      stores[id] = { ...stores[id], [name]: value };
    },
    create: async (profile, initial) => {
      stores[profile.id] = { ...initial };
      index = { profiles: [...index.profiles, profile], activeId: profile.id };

      return index;
    },
    switch: async (id) => {
      index = { ...index, activeId: id };

      return index;
    },
    rename: async (id, name) => {
      index = { ...index, profiles: index.profiles.map((profile) => (profile.id === id ? { ...profile, name } : profile)) };

      return index;
    },
    remove: async (id) => {
      delete stores[id];

      const profiles = index.profiles.filter((profile) => profile.id !== id);
      index = { profiles, activeId: index.activeId === id ? (profiles[0]?.id ?? null) : index.activeId };

      return index;
    },
  };
};

export const profilesApi: ProfilesAPI = window.electronAPI?.profiles ?? createMemoryProfiles();

/**
 * Profile list and the active profile's persisted stores, read synchronously once at startup: the
 * per-profile stores are created (and hydrated) while this module's importers are still evaluating.
 */
const snapshot: ProfileSnapshot = profilesApi.loadSync();

export const getInitialProfileIndex = (): ProfileIndex => snapshot.index;

/** Storage backend of the per-profile stores: reads come from the startup snapshot, writes go to the profile's file. */
export const profileStorage: StateStorage = {
  getItem: (name) => snapshot.stores[name] ?? null,
  setItem: (name, value) => {
    const profileId = snapshot.index.activeId;
    snapshot.stores[name] = value;

    if (profileId) {
      profilesApi.saveStore(profileId, name, value).catch((err) => console.error('Saving the profile failed:', err));
    }
  },
  removeItem: (name) => {
    delete snapshot.stores[name];
  },
};

/** Data the app kept in `localStorage` before profiles existed; the first profile takes it over. */
export const readLegacyStores = (): Record<string, string> => {
  const stores: Record<string, string> = {};

  try {
    PROFILE_STORE_NAMES.forEach((name) => {
      const value = localStorage.getItem(storageKey(name));

      if (value !== null) {
        stores[name] = value;
      }
    });
  } catch {
    // storage unavailable: nothing to take over
  }

  return stores;
};

export const clearLegacyStores = (): void => {
  try {
    PROFILE_STORE_NAMES.forEach((name) => localStorage.removeItem(storageKey(name)));
  } catch {
    // nothing to clear
  }
};

const SKIP_SPLASH_KEY = storageKey('skipSplash');

/** The reload that follows creating the first profile continues the first launch, so it must not replay the splash animation. */
export const skipSplashOnNextStart = (): void => {
  try {
    sessionStorage.setItem(SKIP_SPLASH_KEY, '1');
  } catch {
    // the splash simply plays again
  }
};

/** Whether the splash is to be skipped this time; the request is used up by asking. */
export const consumeSplashSkip = (): boolean => {
  try {
    const skip = sessionStorage.getItem(SKIP_SPLASH_KEY) === '1';
    sessionStorage.removeItem(SKIP_SPLASH_KEY);

    return skip;
  } catch {
    return false;
  }
};
