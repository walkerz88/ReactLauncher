import { useMemo, useState, type FC } from 'react';

import { groupByGenre, groupBySeries, OTHER_KEY } from '@/app/lib/groupApps';
import { sortApps } from '@/app/lib/sortApps';
import { getGalleryViewEntry, useGalleryViewStore } from '@/app/store/galleryViewStore';
import { usePlaytimeStore } from '@/app/store/playtimeStore';
import { useTranslation } from '@/app/i18n';
import type { ContentApp } from '@/electron';
import { AppGrid } from '@/widgets/AppGrid';
import { GalleryControls, type GalleryViewMode } from '@/widgets/GalleryControls';

export interface AppCollectionProps {
  /** Non-empty list of apps to filter/group. Callers handle their own "empty" state upstream. */
  apps: ContentApp[];
  /** Heading shown above the flat grid; grouped views use each group's own label instead. */
  title: string;
  /**
   * Identifies this instance's view mode + filters in the persisted gallery
   * view store (e.g. `'gallery'`, `'recent'`, `'favorites'`), so the gallery
   * and recently-launched tabs and the favourites page each keep their own
   * choice across an app restart instead of sharing or resetting it.
   */
  contextKey: string;
}

/**
 * View-mode switcher + genre/series filters (`GalleryControls`) driving a
 * filtered/grouped `AppGrid`. Shared by the gallery, favourites and
 * recently-launched pages so all three browse the library the same way.
 */
export const AppCollection: FC<AppCollectionProps> = ({ apps, title, contextKey }) => {
  const t = useTranslation();

  const { viewMode, genreFilter, seriesFilter, sortMode } = useGalleryViewStore((state) =>
    getGalleryViewEntry(state.byContext, contextKey),
  );
  const setViewMode = useGalleryViewStore((state) => state.setViewMode);
  const setGenreFilter = useGalleryViewStore((state) => state.setGenreFilter);
  const setSeriesFilter = useGalleryViewStore((state) => state.setSeriesFilter);
  const setSortMode = useGalleryViewStore((state) => state.setSortMode);
  const playtime = usePlaytimeStore((state) => state.byId);
  const resetFilters = useGalleryViewStore((state) => state.resetFilters);

  // Not persisted (unlike the filters above) — a search term left over from
  // a previous visit would just hide the library on the next launch.
  const [searchQuery, setSearchQuery] = useState('');

  const genres = useMemo(
    () =>
      Array.from(new Set(apps.flatMap((app) => (app.genre ? [app.genre] : [])))).sort((a, b) =>
        t(a).localeCompare(t(b)),
      ),
    [apps, t],
  );
  const seriesList = useMemo(() => {
    const named = Array.from(
      new Set(apps.flatMap((app) => (app.series ? [app.series] : []))),
    ).sort((a, b) => a.localeCompare(b));
    // Games without a series get their own "Другое" filter option, same as
    // in the grouped "По сериям" view.
    const hasOther = apps.some((app) => !app.series);

    return hasOther ? [...named, OTHER_KEY] : named;
  }, [apps]);

  const handleViewModeChange = (mode: GalleryViewMode) => {
    setViewMode(contextKey, mode);
    // A filter on the axis you're now grouping by is redundant — grouping
    // already narrows it, and hiding the control while it's still active
    // would look like the filter silently stopped working.
    if (mode === 'genre') {
      setGenreFilter(contextKey, null);
    }
    if (mode === 'series') {
      setSeriesFilter(contextKey, null);
    }
  };

  const handleResetFilters = () => {
    resetFilters(contextKey);
    setSearchQuery('');
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredApps = sortApps(apps, sortMode, playtime).filter((app) => {
    if (normalizedQuery && !app.name.toLowerCase().includes(normalizedQuery)) {
      return false;
    }
    if (genreFilter && app.genre !== genreFilter) {
      return false;
    }
    if (seriesFilter === OTHER_KEY) {
      return !app.series;
    }
    if (seriesFilter && app.series !== seriesFilter) {
      return false;
    }

    return true;
  });

  const controls = (
    <GalleryControls
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      genres={genres}
      genreFilter={genreFilter}
      onGenreFilterChange={(value) => setGenreFilter(contextKey, value)}
      seriesList={seriesList}
      seriesFilter={seriesFilter}
      onSeriesFilterChange={(value) => setSeriesFilter(contextKey, value)}
      sortMode={sortMode}
      onSortModeChange={(mode) => setSortMode(contextKey, mode)}
      onResetFilters={handleResetFilters}
    />
  );

  if (filteredApps.length === 0) {
    return (
      <>
        {controls}
        <p className="home-hint">{t('gallery.filter.empty')}</p>
      </>
    );
  }

  const otherLabel = t('gallery.series.other');
  const groups =
    viewMode === 'genre'
      ? groupByGenre(filteredApps, t, otherLabel)
      : viewMode === 'series'
        ? groupBySeries(filteredApps, otherLabel)
        : null;

  return (
    <>
      {controls}

      {groups ? (
        groups.map((group) => (
          <section className="home-section" key={group.key}>
            <h2 className="home-section__title">{group.label}</h2>
            <AppGrid apps={group.apps} />
          </section>
        ))
      ) : (
        <section className="home-section">
          <h1 className="home-section__title">{title}</h1>
          <AppGrid apps={filteredApps} />
        </section>
      )}
    </>
  );
};
