import type { RawAppConfig } from '@/electron';

/** Step 1 — data that needs no files on disk. */
export interface BasicsDraft {
  name: string;
  genre: string;
  series: string;
  rating: string;
  descriptionRu: string;
  descriptionEn: string;
  /** Facts imported from Steam (year, developer, publisher). */
  facts: NonNullable<RawAppConfig['facts']>;
  /** Steam app id the data was imported from; assets are downloaded for it once the folder exists. */
  steamAppId: string;
}

/** Step 4 — paths relative to the game's folder; an empty string means "use the default". */
export interface PathsDraft {
  coverHorizontal: string;
  coverVertical: string;
  exec: string;
  settings: string;
  installer: string;
  bonus: string;
}

export const EMPTY_BASICS: BasicsDraft = {
  name: '',
  genre: '',
  series: '',
  rating: '',
  descriptionRu: '',
  descriptionEn: '',
  facts: [],
  steamAppId: '',
};

export const EMPTY_PATHS: PathsDraft = {
  coverHorizontal: '',
  coverVertical: '',
  exec: '',
  settings: '',
  installer: '',
  bonus: '',
};

/** Builds the `config.json` content, leaving out everything the user left empty. */
export const buildConfig = (basics: BasicsDraft, paths: PathsDraft): RawAppConfig => {
  const config: RawAppConfig = { name: basics.name.trim() };

  if (basics.genre) {
    config.genre = basics.genre;
  }

  if (basics.series.trim()) {
    config.series = basics.series.trim();
  }

  const rating = Number.parseFloat(basics.rating);

  if (Number.isFinite(rating)) {
    config.rating = Math.min(10, Math.max(0, rating));
  }

  const descriptionRu = basics.descriptionRu.trim();
  const descriptionEn = basics.descriptionEn.trim();

  if (descriptionRu || descriptionEn) {
    config.description = { ru: descriptionRu || undefined, en: descriptionEn || undefined };
  }

  if (basics.facts.length > 0) {
    config.facts = basics.facts;
  }

  const filledPaths = Object.fromEntries(
    Object.entries(paths)
      .map(([field, value]) => [field, value.trim()])
      .filter(([, value]) => value),
  );

  if (Object.keys(filledPaths).length > 0) {
    config.paths = filledPaths;
  }

  return config;
};
