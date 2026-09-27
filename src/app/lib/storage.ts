/** Prefix of every persisted `localStorage` key; comes from `name` in package.json (see `craco.config.js`). */
export const STORAGE_PREFIX = process.env.REACT_APP_STORAGE_PREFIX ?? '';

export const storageKey = (name: string): string => `${STORAGE_PREFIX}.${name}`;
