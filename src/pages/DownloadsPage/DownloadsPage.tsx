import { useState, type FC } from 'react';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { useContentStore } from '@/app/store/contentStore';
import { pickTableSort, useTableSortStore } from '@/app/store/tableSortStore';
import { useTorrentsStore } from '@/app/store/torrentsStore';
import type { TorrentInfo, TorrentResult } from '@/electron';
import { AddGameWizard, type AddMode } from '@/features/AddGame';
import { Message } from '@/shared/Message';
import { Tooltip } from '@/shared/Tooltip';

import { RemoveTorrentModal } from './components/RemoveTorrentModal';
import { TorrentRow } from './components/TorrentRow';

import './DownloadsPage.css';

const COLUMNS = [
  'name',
  'status',
  'progress',
  'size',
  'download',
  'upload',
  'eta',
  'seeds',
  'peers',
] as const;

type Column = (typeof COLUMNS)[number];

interface Sort {
  column: Column;
  descending: boolean;
}

const ICON_SIZE = 14;

export const DownloadsPage: FC = () => {
  const t = useTranslation();
  const torrents = useTorrentsStore((state) => state.torrents);
  const apps = useContentStore((state) => state.apps);
  const [wizard, setWizard] = useState<{ initialMode?: AddMode } | null>(null);
  const [removing, setRemoving] = useState<TorrentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sortByTable = useTableSortStore((state) => state.byTable);
  const setStoredSort = useTableSortStore((state) => state.setSort);
  const sort: Sort | null = pickTableSort(sortByTable, 'downloads', COLUMNS);

  const gameNameOf = (torrent: TorrentInfo): string | null =>
    apps.find((app) => app.id === torrent.gameId)?.name ?? null;

  const sortValue = (torrent: TorrentInfo, column: Column): string | number => {
    switch (column) {
      case 'name':
        return gameNameOf(torrent) ?? torrent.name;
      case 'status':
        return t(`downloads.state.${torrent.state}`);
      case 'progress':
        return torrent.progress;
      case 'size':
        return torrent.size;
      case 'download':
        return torrent.downloadSpeed;
      case 'upload':
        return torrent.uploadSpeed;
      case 'eta':
        return torrent.eta ?? Infinity;
      case 'seeds':
        return torrent.seeds;
      case 'peers':
        return torrent.peers;
    }
  };

  const sortedTorrents = sort
    ? [...torrents].sort((a, b) => {
        const first = sortValue(a, sort.column);
        const second = sortValue(b, sort.column);
        const order =
          typeof first === 'string' && typeof second === 'string'
            ? first.localeCompare(second, undefined, { numeric: true })
            : Number(first) - Number(second) || 0;

        return sort.descending ? -order : order;
      })
    : torrents;

  const toggleSort = (column: Column) => {
    setStoredSort('downloads', { column, descending: sort?.column === column ? !sort.descending : false });
  };

  const run = async (action: () => Promise<TorrentResult> | undefined) => {
    try {
      const result = await action();

      setError(result && !result.ok ? result.error : null);
    } catch (err) {
      console.error(err);
      setError(t('downloads.failed'));
    }
  };

  const api = window.electronAPI?.torrents;

  return (
    <div className="page downloads" data-id="DownloadsPage">
      <div className="downloads__header">
        <h1 className="home-section__title">{t('downloads.title')}</h1>

        {torrents.length > 0 ? (
          <Tooltip label={t('addGame.button')}>
            <button
              type="button"
              className="downloads__plus"
              aria-label={t('addGame.button')}
              onClick={() => setWizard({ initialMode: 'torrent' })}
              data-gamepad-focusable
            >
              <Plus size={18} />
            </button>
          </Tooltip>
        ) : null}
      </div>

      {error ? <Message type="error">{error}</Message> : null}

      {torrents.length === 0 ? (
        <div className="downloads__empty">
          <Tooltip label={t('addGame.button')}>
            <button
              type="button"
              className="downloads__add"
              aria-label={t('addGame.button')}
              onClick={() => setWizard({ initialMode: 'torrent' })}
              data-gamepad-focusable
            >
              <Plus size={40} />
            </button>
          </Tooltip>
        </div>
      ) : (
        <div className="downloads__table-wrap">
          <table className="downloads__table">
            <thead>
              <tr>
                <th scope="col" />
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    aria-sort={sort?.column === column ? (sort.descending ? 'descending' : 'ascending') : 'none'}
                  >
                    <button type="button" className="downloads__sort" onClick={() => toggleSort(column)} data-gamepad-focusable>
                      {t(`downloads.col.${column}`)}
                      {sort?.column === column ? (
                        sort.descending ? (
                          <ArrowDown size={ICON_SIZE} />
                        ) : (
                          <ArrowUp size={ICON_SIZE} />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTorrents.map((torrent) => (
                <TorrentRow
                  key={torrent.id}
                  torrent={torrent}
                  gameName={gameNameOf(torrent)}
                  onPause={(id) => void run(() => api?.pause(id))}
                  onResume={(id) => void run(() => api?.resume(id))}
                  onOpenFolder={(id) => void run(() => api?.openFolder(id))}
                  onRemove={setRemoving}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {wizard ? <AddGameWizard initialMode={wizard.initialMode} onClose={() => setWizard(null)} /> : null}

      {removing ? (
        <RemoveTorrentModal
          torrent={removing}
          title={gameNameOf(removing) ?? removing.name}
          onRemove={(deleteFiles) => {
            const { id } = removing;

            setRemoving(null);
            void run(() => api?.remove(id, deleteFiles));
          }}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
};
