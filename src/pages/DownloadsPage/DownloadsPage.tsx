import { useState, type FC } from 'react';
import { Plus } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { useContentStore } from '@/app/store/contentStore';
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

export const DownloadsPage: FC = () => {
  const t = useTranslation();
  const torrents = useTorrentsStore((state) => state.torrents);
  const apps = useContentStore((state) => state.apps);
  const [wizard, setWizard] = useState<{ initialMode?: AddMode } | null>(null);
  const [removing, setRemoving] = useState<TorrentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gameNameOf = (torrent: TorrentInfo): string | null =>
    apps.find((app) => app.id === torrent.gameId)?.name ?? null;

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
    <div className="page page--scroll-pad downloads" data-id="DownloadsPage">
      <h1 className="home-section__title">{t('downloads.title')}</h1>

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
                {COLUMNS.map((column) => (
                  <th key={column} scope="col">
                    {t(`downloads.col.${column}`)}
                  </th>
                ))}
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {torrents.map((torrent) => (
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
