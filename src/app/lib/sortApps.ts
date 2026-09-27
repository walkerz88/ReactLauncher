import type { PlaytimeEntry } from '@/app/store/playtimeStore';
import type { ContentApp } from '@/electron';

export const GALLERY_SORT_MODES = ['name', 'rating', 'added', 'lastPlayed', 'playtime'] as const;

export type GallerySortMode = (typeof GALLERY_SORT_MODES)[number];

/** Descending by `value`; games without a value go last. */
const byValueDesc = (value: (app: ContentApp) => number | null | undefined) => (a: ContentApp, b: ContentApp) =>
  (value(b) ?? -1) - (value(a) ?? -1);

export const sortApps = (
  apps: ContentApp[],
  mode: GallerySortMode,
  playtime: Record<string, PlaytimeEntry>,
): ContentApp[] => {
  switch (mode) {
    case 'name':
      return [...apps].sort((a, b) => a.name.localeCompare(b.name));
    case 'rating':
      return [...apps].sort(byValueDesc((app) => app.rating));
    case 'added':
      return [...apps].sort(byValueDesc((app) => app.addedAt));
    case 'lastPlayed':
      return [...apps].sort(byValueDesc((app) => playtime[app.id]?.lastPlayedAt));
    case 'playtime':
      return [...apps].sort(byValueDesc((app) => (playtime[app.id]?.seconds ? playtime[app.id].seconds : null)));
    default:
      return apps;
  }
};
