import { ArrowDown, ArrowUp, Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { formatFileSize } from '@/app/lib/format';
import { useLibrarySizesStore } from '@/app/store/librarySizesStore';
import { HorizontalBarChart, type HorizontalBarChartRow } from '@/shared/HorizontalBarChart';
import { RatingBadge } from '@/shared/RatingBadge';
import { Tooltip } from '@/shared/Tooltip';
import type { AppSizes, ContentApp } from '@/electron';

import { DiskSpaceSummary } from './DiskSpaceSummary';
import { FieldStatusIcon } from './FieldStatusIcon';

interface LibrarySizesProps {
  apps: ContentApp[];
}

const SIZE_COLUMNS: ReadonlyArray<keyof AppSizes> = ['installer', 'data', 'trailer', 'covers', 'bonus'];

/** `name`, `rating` and `total` aren't size columns (not in `AppSizes`, not part of the totals bar chart)
 * but sort alongside them in the same table, so the sortable column set is the size columns plus these. */
type TableColumn = keyof AppSizes | 'rating' | 'total' | 'name';

type SortDirection = 'asc' | 'desc';

interface Sort {
  column: TableColumn;
  direction: SortDirection;
}

/** How much disk space each part of every game folder (`./content/<GameName>`) takes. The table (every
 * game from `apps`) renders immediately; cells fill in live as `useLibrarySizesStore` measures each game,
 * so there's no separate loading screen. Results are kept in that store across tab switches — leaving
 * the tab mid-scan cancels it instead of letting it churn in the background, and returning resumes from
 * whatever was already measured rather than starting over. */
export const LibrarySizes: FC<LibrarySizesProps> = ({ apps }) => {
  const t = useTranslation();
  const sizes = useLibrarySizesStore((state) => state.sizes);
  const scanning = useLibrarySizesStore((state) => state.scanning);
  const failed = useLibrarySizesStore((state) => state.failed);
  const rescan = useLibrarySizesStore((state) => state.rescan);
  const [sort, setSort] = useState<Sort>({ column: 'data', direction: 'desc' });
  const [diskReloadKey, setDiskReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    useLibrarySizesStore.getState().ensureLoaded(apps);

    return () => {
      useLibrarySizesStore.getState().cancelIfScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The apps still ahead in the (single-threaded, in-order) scan queue — the first of them is whichever
  // one is being measured right now, so its name gets the spinner.
  const scanningId = scanning ? apps.find((app) => !(app.id in sizes))?.id ?? null : null;
  const measuredCount = apps.filter((app) => app.id in sizes).length;
  const scanProgressPercent = apps.length > 0 ? (measuredCount / apps.length) * 100 : 0;

  // Sums whatever's been measured so far per column — grows live as the scan works through the library,
  // same as the table below it.
  const totalsRows: HorizontalBarChartRow[] = SIZE_COLUMNS.map((column) => ({
    key: column,
    label: t(`health.sizes.${column}`),
    value: apps.reduce((sum, app) => sum + (sizes[app.id]?.[column] ?? 0), 0),
  })).sort((a, b) => b.value - a.value);

  const totalOf = (app: ContentApp): number => {
    const measured = sizes[app.id];

    return measured ? SIZE_COLUMNS.reduce((sum, column) => sum + (measured[column] ?? 0), 0) : -1;
  };

  const handleRescan = () => {
    rescan(apps);
    setDiskReloadKey((key) => key + 1);
  };

  const toggleSort = (column: TableColumn) => {
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { column, direction: 'desc' },
    );
  };

  const sortedApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query ? apps.filter((app) => app.name.toLowerCase().includes(query)) : apps;

    if (sort.column === 'name') {
      return [...filtered].sort((a, b) => (sort.direction === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)));
    }

    // Unmeasured (not yet in `sizes`) sorts alongside confirmed-absent — both settle at the light end,
    // and a row simply moves up once its real size comes in.
    const value = (app: ContentApp) => {
      const column = sort.column;

      if (column === 'name') {
        return 0;
      }
      if (column === 'rating') {
        return app.rating ?? -1;
      }
      if (column === 'total') {
        return totalOf(app);
      }

      return sizes[app.id]?.[column] ?? -1;
    };

    return [...filtered].sort((a, b) => (sort.direction === 'desc' ? value(b) - value(a) : value(a) - value(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps, sizes, sort, searchQuery]);

  const renderCell = (app: ContentApp, column: keyof AppSizes) => {
    const measured = sizes[app.id];

    if (!measured) {
      return null;
    }

    const bytes = measured[column];

    if (bytes != null) {
      return formatFileSize(bytes);
    }

    const label = column === 'data' ? t('health.sizes.dataMissing') : t('health.sizes.missing');

    return <FieldStatusIcon status="missing" label={label} withTooltip={false} />;
  };

  const renderTotal = (app: ContentApp) => {
    const total = totalOf(app);

    return total >= 0 ? formatFileSize(total) : null;
  };

  const renderSortHeader = (column: TableColumn, label: string, className?: string) => {
    const active = sort.column === column;
    const SortIcon = sort.direction === 'desc' ? ArrowDown : ArrowUp;

    return (
      <th key={column} className={className}>
        <button type="button" className="library-health__sort-button" onClick={() => toggleSort(column)} data-gamepad-focusable>
          {label}
          {active ? <SortIcon size={12} aria-hidden="true" /> : null}
        </button>
      </th>
    );
  };

  return (
    <section className="library-health__sizes" data-id="LibrarySizes">
      {failed ? <p className="home-hint">{t('health.sizes.failed')}</p> : null}

      <div className="library-health__sizes-overview">
        <div className="library-health__totals">
          <h2 className="library-health__title">{t('health.sizes.title')}</h2>
          {/* Always 5 rows (one per column) — `emptyLabel` is unreachable, just satisfying the prop. */}
          <HorizontalBarChart rows={totalsRows} emptyLabel={t('health.sizes.totalsEmpty')} formatValue={formatFileSize} />
        </div>

        <div className="library-health__sizes-summary">
          <h3 className="library-health__title">{t('health.sizes.summary')}</h3>
          <DiskSpaceSummary reloadKey={diskReloadKey} />

          <div className="library-health__sizes-loading">
            <button
              type="button"
              className="btn btn--small library-health__scan-button"
              onClick={handleRescan}
              disabled={scanning}
              data-gamepad-focusable
            >
              {scanning ? <span className="library-health__scan-fill" style={{ width: `${scanProgressPercent}%` }} /> : null}
              <span className="library-health__scan-label">
                {scanning ? (
                  <>
                    <Loader2 size={14} className="library-health__spin library-health__scan-spinner" aria-hidden="true" />
                    {t('health.sizes.loadingProgress').replace('{done}', String(measuredCount)).replace('{total}', String(apps.length))}
                  </>
                ) : (
                  t('health.sizes.scan')
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="library-health__search">
        <Search size={14} className="library-health__search-icon" aria-hidden="true" />
        <input
          type="text"
          className="library-health__search-input"
          value={searchQuery}
          placeholder={t('gallery.filter.search')}
          aria-label={t('gallery.filter.search')}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery ? (
          <button
            type="button"
            className="library-health__search-clear"
            onClick={() => setSearchQuery('')}
            aria-label={t('gallery.filter.searchClear')}
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      <table className="library-health__table">
        <thead>
          <tr>
            {renderSortHeader('name', t('health.columnName'))}
            {renderSortHeader('rating', t('health.column.rating'), 'library-health__col-size')}
            {SIZE_COLUMNS.map((column) => renderSortHeader(column, t(`health.sizes.${column}`), 'library-health__col-size'))}
            {renderSortHeader('total', t('health.sizes.total'), 'library-health__col-size')}
          </tr>
        </thead>

        <tbody>
          {sortedApps.map((app) => (
            <tr key={app.id} className="library-health__row">
              <td className="library-health__name">
                {app.id === scanningId ? (
                  <Loader2 size={14} className="library-health__spin library-health__scan-spinner" aria-hidden="true" />
                ) : null}
                {app.name}
              </td>
              <td className="library-health__col-size">
                <Tooltip label={t('health.column.rating')}>
                  <span>{app.rating != null ? <RatingBadge rating={app.rating} /> : null}</span>
                </Tooltip>
              </td>
              {SIZE_COLUMNS.map((column) => (
                <td key={column} className="library-health__col-size">
                  <Tooltip label={t(`health.sizes.${column}`)}>
                    <span>{renderCell(app, column)}</span>
                  </Tooltip>
                </td>
              ))}
              <td className="library-health__col-size">
                <Tooltip label={t('health.sizes.total')}>
                  <span>{renderTotal(app)}</span>
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
