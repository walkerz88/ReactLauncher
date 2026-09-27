import type { ContentApp } from '@/electron';

/** Sentinel key for apps with no genre/series — the "Другое" bucket/filter option. */
export const OTHER_KEY = '__other__';

export interface AppGroup {
  key: string;
  label: string;
  apps: ContentApp[];
}

/**
 * Buckets `apps` by `keyOf(app)`, resolving each bucket's key to a display
 * label via `labelOf`. Apps with no key land in one "other" bucket, sorted
 * last. Groups are otherwise sorted alphabetically by label.
 */
function groupApps(
  apps: ContentApp[],
  keyOf: (app: ContentApp) => string | null,
  labelOf: (key: string) => string,
  otherLabel: string,
): AppGroup[] {
  const buckets = new Map<string, ContentApp[]>();
  const other: ContentApp[] = [];

  for (const app of apps) {
    const key = keyOf(app);
    if (!key) {
      other.push(app);
      continue;
    }
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(app);
    } else {
      buckets.set(key, [app]);
    }
  }

  const groups = Array.from(buckets.entries())
    .map(([key, groupApps]) => ({ key, label: labelOf(key), apps: groupApps }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (other.length > 0) {
    groups.push({ key: OTHER_KEY, label: otherLabel, apps: other });
  }

  return groups;
}

/** Groups by `genre` (an i18n key), resolved to text via `t`. */
export function groupByGenre(
  apps: ContentApp[],
  t: (key: string) => string,
  otherLabel: string,
): AppGroup[] {
  return groupApps(apps, (app) => app.genre, t, otherLabel);
}

/** Groups by `series` (a plain, un-localized franchise name). */
export function groupBySeries(apps: ContentApp[], otherLabel: string): AppGroup[] {
  return groupApps(
    apps,
    (app) => app.series,
    (key) => key,
    otherLabel,
  );
}
