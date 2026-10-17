import type { FC } from 'react';
import { Search, X } from 'lucide-react';

import { OTHER_KEY } from '@/app/lib/groupApps';
import { GALLERY_SORT_MODES, type GallerySortMode } from '@/app/lib/sortApps';
import { useTranslation } from '@/app/i18n';
import { SearchSelect } from '@/shared/SearchSelect';

import './GalleryControls.css';

export type GalleryViewMode = 'flat' | 'genre' | 'series';

export interface GalleryControlsProps {
  viewMode: GalleryViewMode;
  onViewModeChange: (mode: GalleryViewMode) => void;
  /** Case-insensitive name filter; matching itself happens in the caller. */
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  /** Genre i18n keys present in the collection (e.g. `genre.action`), already sorted. */
  genres: string[];
  genreFilters: string[];
  onGenreFiltersChange: (value: string[]) => void;
  /** Tag names present in the collection, already sorted. */
  tags: string[];
  tagFilters: string[];
  onTagFiltersChange: (value: string[]) => void;
  /** Series names present in the collection, already sorted. */
  seriesList: string[];
  seriesFilter: string | null;
  onSeriesFilterChange: (value: string | null) => void;
  sortMode: GallerySortMode;
  onSortModeChange: (mode: GallerySortMode) => void;
  /** Clears both filters at once; the button only shows while one is active. */
  onResetFilters: () => void;
}

/**
 * View-mode switcher (Все / По жанру / По сериям) plus genre/tag/series
 * filter dropdowns, and a quick "reset filters" button. A filter is hidden while its
 * own axis is the active grouping — grouping already narrows that dimension.
 * Shared by the gallery, favourites and recently-launched pages.
 */
export const GalleryControls: FC<GalleryControlsProps> = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  genres,
  genreFilters,
  onGenreFiltersChange,
  tags,
  tagFilters,
  onTagFiltersChange,
  seriesList,
  seriesFilter,
  onSeriesFilterChange,
  sortMode,
  onSortModeChange,
  onResetFilters,
}) => {
  const t = useTranslation();
  const hasActiveFilters = genreFilters.length > 0 || tagFilters.length > 0 || seriesFilter != null || searchQuery !== '';

  const viewButton = (mode: GalleryViewMode, label: string) => (
    <button
      type="button"
      className={`gallery-controls__view${viewMode === mode ? ' active' : ''}`}
      aria-pressed={viewMode === mode}
      onClick={() => onViewModeChange(mode)}
    >
      {label}
    </button>
  );

  return (
    <div className="gallery-controls" data-id="GalleryControls">
      <div className="gallery-controls__views">
        {viewButton('flat', t('gallery.view.flat'))}
        {viewButton('genre', t('gallery.view.genre'))}
        {viewButton('series', t('gallery.view.series'))}
      </div>

      <div className="gallery-controls__filters">
        <div className="gallery-controls__search">
          <Search size={14} className="gallery-controls__search-icon" aria-hidden="true" />
          <input
            type="text"
            className="gallery-controls__search-input"
            value={searchQuery}
            placeholder={t('gallery.filter.search')}
            aria-label={t('gallery.filter.search')}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="gallery-controls__search-clear"
              onClick={() => onSearchQueryChange('')}
              aria-label={t('gallery.filter.searchClear')}
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        <SearchSelect
          options={GALLERY_SORT_MODES.map((mode) => ({ value: mode, label: t(`gallery.sort.${mode}`) }))}
          selected={[sortMode]}
          placeholder={t('gallery.sort.label')}
          searchPlaceholder={t('gallery.filter.selectSearch')}
          emptyLabel={t('gallery.filter.selectEmpty')}
          ariaLabel={t('gallery.sort.label')}
          searchable={false}
          onChange={([mode]) => onSortModeChange(mode as GallerySortMode)}
        />

        {viewMode !== 'genre' && genres.length > 0 ? (
          <SearchSelect
            options={genres.map((key) => ({ value: key, label: t(key) }))}
            selected={genreFilters}
            placeholder={t('gallery.filter.allGenres')}
            searchPlaceholder={t('gallery.filter.selectSearch')}
            emptyLabel={t('gallery.filter.selectEmpty')}
            ariaLabel={t('gallery.filter.genre')}
            multiple
            onChange={onGenreFiltersChange}
          />
        ) : null}

        {tags.length > 0 ? (
          <SearchSelect
            options={tags.map((tag) => ({ value: tag, label: tag }))}
            selected={tagFilters}
            placeholder={t('gallery.filter.allTags')}
            searchPlaceholder={t('gallery.filter.selectSearch')}
            emptyLabel={t('gallery.filter.selectEmpty')}
            ariaLabel={t('gallery.filter.tags')}
            multiple
            onChange={onTagFiltersChange}
          />
        ) : null}

        {viewMode !== 'series' && seriesList.length > 0 ? (
          <SearchSelect
            options={seriesList.map((value) => ({
              value,
              label: value === OTHER_KEY ? t('gallery.series.other') : value,
            }))}
            selected={seriesFilter ? [seriesFilter] : []}
            placeholder={t('gallery.filter.allSeries')}
            searchPlaceholder={t('gallery.filter.selectSearch')}
            emptyLabel={t('gallery.filter.selectEmpty')}
            ariaLabel={t('gallery.filter.series')}
            clearable
            onChange={(value) => onSeriesFilterChange(value[0] ?? null)}
          />
        ) : null}

        {hasActiveFilters ? (
          <button type="button" className="gallery-controls__reset" onClick={onResetFilters}>
            <X size={14} />
            {t('gallery.filter.reset')}
          </button>
        ) : null}
      </div>
    </div>
  );
};
