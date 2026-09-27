import * as fs from 'fs';
import * as path from 'path';

import type { Sealer } from './profileCrypto';

/**
 * Profile storage on disk:
 *   <dir>/profiles.json   { activeId, profiles: [{ id, name, createdAt }] }   (plain: nothing to protect)
 *   <dir>/<id>.json       sealed { stores: { <storeName>: <persisted state object>, … } }
 *
 * Profile files are encrypted and authenticated (see `profileCrypto`): a file that was edited, damaged or
 * swapped with another profile's fails to open, is set aside as `<id>.json.corrupt-<time>`, and the profile
 * starts empty — so play time and achievements can't be raised by hand-editing.
 *
 * Every persisted renderer store that belongs to a profile (play time, favourites, theme, …) is one
 * entry of `stores`. Kept free of Electron imports so it can be exercised on its own.
 */

export interface ProfileMeta {
  id: string;
  name: string;
  createdAt: number;
}

export interface ProfileIndex {
  profiles: ProfileMeta[];
  activeId: string | null;
}

/** What the renderer needs at startup: the profile list and the raw persisted stores of the active profile. */
export interface ProfileSnapshot {
  index: ProfileIndex;
  stores: Record<string, string>;
}

const ID_PATTERN = /^[a-z0-9]{1,32}$/i;
const STORE_NAME_PATTERN = /^[A-Za-z]{1,40}$/;
const MAX_NAME_LENGTH = 30;
const MAX_STORE_LENGTH = 4 * 1024 * 1024;
const INDEX_FILE = 'profiles.json';
/** Stores only the main process writes (statistics, achievements): the renderer can neither read nor write them. */
const RESERVED_STORES: readonly string[] = ['progress'];

const isProfileMeta = (value: unknown): value is ProfileMeta => {
  const profile = value as Partial<ProfileMeta> | null;

  return (
    typeof profile?.id === 'string' &&
    ID_PATTERN.test(profile.id) &&
    typeof profile.name === 'string' &&
    profile.name.trim().length > 0 &&
    typeof profile.createdAt === 'number'
  );
};

const assertId = (id: unknown): string => {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new Error('Invalid profile id');
  }

  return id;
};

const assertStoreName = (name: unknown): string => {
  if (typeof name !== 'string' || !STORE_NAME_PATTERN.test(name)) {
    throw new Error('Invalid store name');
  }

  return name;
};

const assertStoreValue = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > MAX_STORE_LENGTH) {
    throw new Error('Invalid store value');
  }

  return value;
};

export const createProfileFiles = (dir: string, sealer: Sealer) => {
  const indexPath = path.join(dir, INDEX_FILE);
  const profilePath = (id: string): string => path.join(dir, `${assertId(id)}.json`);

  let index: ProfileIndex | null = null;
  // Writes run one after another, so two quick changes can't interleave on the same file.
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => undefined);

    return result;
  };

  const writeFileAtomic = async (file: string, content: string): Promise<void> => {
    await fs.promises.mkdir(dir, { recursive: true });

    const temp = `${file}.tmp`;
    await fs.promises.writeFile(temp, content, 'utf-8');
    await fs.promises.rename(temp, file);
  };

  const writeProfileFile = (id: string, stores: Record<string, unknown>): Promise<void> => {
    const file = profilePath(id);

    return writeFileAtomic(file, sealer.seal(JSON.stringify({ stores }), path.basename(file)));
  };

  const readIndexFromDisk = (): ProfileIndex => {
    try {
      const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as Partial<ProfileIndex>;
      const profiles = Array.isArray(parsed.profiles) ? parsed.profiles.filter(isProfileMeta) : [];
      const active = profiles.find((profile) => profile.id === parsed.activeId) ?? profiles[0] ?? null;

      return { profiles, activeId: active?.id ?? null };
    } catch {
      return { profiles: [], activeId: null };
    }
  };

  const getIndex = (): ProfileIndex => {
    index ??= readIndexFromDisk();

    return index;
  };

  const saveIndex = async (next: ProfileIndex): Promise<ProfileIndex> => {
    index = next;
    await writeFileAtomic(indexPath, JSON.stringify(next, null, 2) + '\n');

    return next;
  };

  /** The stores saved for a profile; an unreadable (tampered or damaged) file is set aside and reads as empty. */
  const readStores = (id: string): Record<string, unknown> => {
    const file = profilePath(id);
    let raw: string;

    try {
      raw = fs.readFileSync(file, 'utf-8');
    } catch {
      return {};
    }

    const plain = sealer.open(raw, path.basename(file));

    try {
      const parsed = plain === null ? null : (JSON.parse(plain) as { stores?: Record<string, unknown> });

      if (parsed && typeof parsed.stores === 'object' && parsed.stores !== null) {
        return Object.fromEntries(Object.entries(parsed.stores).filter(([name]) => STORE_NAME_PATTERN.test(name)));
      }
    } catch {
      // falls through to the quarantine below
    }

    console.warn(`[profiles] ${path.basename(file)} failed verification and was set aside`);

    try {
      fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
    } catch {
      // the next successful save overwrites it anyway
    }

    return {};
  };

  /** Rebuilt from disk on every window load, so what the renderer starts with is always what is stored. */
  const loadSnapshot = (): ProfileSnapshot => {
    index = readIndexFromDisk();

    const stores = index.activeId ? readStores(index.activeId) : {};

    return {
      index,
      stores: Object.fromEntries(
        Object.entries(stores)
          .filter(([name]) => !RESERVED_STORES.includes(name))
          .map(([name, value]) => [name, JSON.stringify(value)]),
      ),
    };
  };

  const persistStore = (id: string, name: string, value: unknown): Promise<void> =>
    enqueue(async () => {
      if (!getIndex().profiles.some((profile) => profile.id === id)) {
        return;
      }

      const stores = readStores(id);
      stores[name] = value;
      await writeProfileFile(id, stores);
    });

  /** The renderer's write path: reserved stores are refused. */
  const saveStore = (id: unknown, name: unknown, value: unknown): Promise<void> => {
    const safeId = assertId(id);
    const safeName = assertStoreName(name);
    const raw = assertStoreValue(value);

    if (RESERVED_STORES.includes(safeName)) {
      throw new Error('Reserved store');
    }

    return persistStore(safeId, safeName, JSON.parse(raw));
  };

  const getActiveId = (): string | null => getIndex().activeId;

  const getProfileCreatedAt = (id: string): number | null =>
    getIndex().profiles.find((profile) => profile.id === id)?.createdAt ?? null;

  /** For the main process' own stores (see `RESERVED_STORES`). */
  const readOwnStore = (id: string, name: string): unknown => readStores(assertId(id))[assertStoreName(name)];

  const writeOwnStore = (id: string, name: string, value: unknown): Promise<void> =>
    persistStore(assertId(id), assertStoreName(name), value);

  const createProfile = (profile: unknown, initialStores: unknown): Promise<ProfileIndex> => {
    if (!isProfileMeta(profile)) {
      throw new Error('Invalid profile');
    }

    const meta: ProfileMeta = {
      id: profile.id,
      name: profile.name.trim().slice(0, MAX_NAME_LENGTH),
      createdAt: profile.createdAt,
    };
    const stores: Record<string, unknown> = {};

    Object.entries((initialStores ?? {}) as Record<string, unknown>).forEach(([name, value]) => {
      stores[assertStoreName(name)] = JSON.parse(assertStoreValue(value));
    });

    return enqueue(async () => {
      const current = getIndex();

      if (current.profiles.some((entry) => entry.id === meta.id)) {
        throw new Error('Profile already exists');
      }

      await writeProfileFile(meta.id, stores);

      return saveIndex({ profiles: [...current.profiles, meta], activeId: meta.id });
    });
  };

  const switchProfile = (id: unknown): Promise<ProfileIndex> => {
    const safeId = assertId(id);

    return enqueue(async () => {
      const current = getIndex();

      if (!current.profiles.some((profile) => profile.id === safeId)) {
        throw new Error('Unknown profile');
      }

      return saveIndex({ ...current, activeId: safeId });
    });
  };

  const renameProfile = (id: unknown, name: unknown): Promise<ProfileIndex> => {
    const safeId = assertId(id);

    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Invalid profile name');
    }

    const safeName = name.trim().slice(0, MAX_NAME_LENGTH);

    return enqueue(async () => {
      const current = getIndex();

      if (!current.profiles.some((profile) => profile.id === safeId)) {
        throw new Error('Unknown profile');
      }

      const profiles = current.profiles.map((profile) => (profile.id === safeId ? { ...profile, name: safeName } : profile));

      return saveIndex({ ...current, profiles });
    });
  };

  const deleteProfile = (id: unknown): Promise<ProfileIndex> => {
    const safeId = assertId(id);

    return enqueue(async () => {
      const current = getIndex();
      const profiles = current.profiles.filter((profile) => profile.id !== safeId);
      const activeId = current.activeId === safeId ? (profiles[0]?.id ?? null) : current.activeId;

      await fs.promises.rm(profilePath(safeId), { force: true });

      return saveIndex({ profiles, activeId });
    });
  };

  return {
    loadSnapshot,
    saveStore,
    createProfile,
    switchProfile,
    renameProfile,
    deleteProfile,
    getActiveId,
    getProfileCreatedAt,
    readOwnStore,
    writeOwnStore,
  };
};

export type ProfileFiles = ReturnType<typeof createProfileFiles>;
