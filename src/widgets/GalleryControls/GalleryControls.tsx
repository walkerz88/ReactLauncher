import type { FC } from 'react';
import { Search, X } from 'lucide-react';

import { OTHER_KEY } from '@/app/lib/groupApps';
import { GALLERY_SORT_MODES, type GallerySortMode } from '@/app/lib/sortApps';
import { useTranslation } from '@/app/i18n';

import './GalleryControls.css';

export type GalleryViewMode = 'flat' | 'genre' | 'series';

/** Series names can be long, and an <option> can't be cut off with CSS, so the text is shortened here. */
const MAX_SERIES_LABEL_LENGTH = 28;

const truncate = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export interface GalleryControlsProps {
  viewMode: GalleryViewMode;
  onViewModeChange: (mode: GalleryViewMode) => void;
  /** Case-insensitive name filter; matching itself happens in the caller. */
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  /** Genre i18n keys present in the collection (e.g. `genre.action`), already sorted. */
  genres: string[];
  genreFilter: string | null;
  onGenreFilterChange: (value: string | null) => void;
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
 * View-mode switcher (Все / По жанру / По сериям) plus genre/series filter
 * selects, and a quick "reset filters" button. A filter is hidden while its
 * own axis is the active grouping — grouping already narrows that dimension.
 * Shared by the gallery, favourites and recently-launched pages.
 */
export const GalleryControls: FC<GalleryControlsProps> = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  genres,
  genreFilter,
  onGenreFilterChange,
  seriesList,
  seriesFilter,
  onSeriesFilterChange,
  sortMode,
  onSortModeChange,
  onResetFilters,
}) => {
  const t = useTranslation();
  const hasActiveFilters = genreFilter != null || seriesFilter != null || searchQuery !== '';

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

        <select
          className="gallery-controls__select"
          value={sortMode}
          aria-label={t('gallery.sort.label')}
          onChange={(event) => onSortModeChange(event.target.value as GallerySortMode)}
        >
          {GALLERY_SORT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`gallery.sort.${mode}`)}
            </option>
          ))}
        </select>

        {viewMode !== 'genre' && genres.length > 0 ? (
          <select
            className="gallery-controls__select"
            value={genreFilter ?? ''}
            aria-label={t('gallery.filter.genre')}
            onChange={(event) => onGenreFilterChange(event.target.value || null)}
          >
            <option value="">{t('gallery.filter.allGenres')}</option>
            {genres.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </select>
        ) : null}

        {viewMode !== 'series' && seriesList.length > 0 ? (
          <select
            className="gallery-controls__select"
            value={seriesFilter ?? ''}
            aria-label={t('gallery.filter.series')}
            onChange={(event) => onSeriesFilterChange(event.target.value || null)}
          >
            <option value="">{t('gallery.filter.allSeries')}</option>
            {seriesList.map((value) => (
              <option key={value} value={value}>
                {value === OTHER_KEY ? t('gallery.series.other') : truncate(value, MAX_SERIES_LABEL_LENGTH)}
              </option>
            ))}
          </select>
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
