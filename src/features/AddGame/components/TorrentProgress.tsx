import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { formatSpeed, formatTransferred } from '@/app/lib/format';
import { useTorrentsStore } from '@/app/store/torrentsStore';
import { Message } from '@/shared/Message';
import { ProgressBar } from '@/shared/ProgressBar';

export interface TorrentProgressProps {
  gameId: string;
}

/** The files step's live view of the torrent that was just started for the new game folder. */
export const TorrentProgress: FC<TorrentProgressProps> = ({ gameId }) => {
  const t = useTranslation();
  const torrent = useTorrentsStore((state) => state.torrents.find((item) => item.gameId === gameId));

  return (
    <div className="add-game__torrent" data-id="TorrentProgress">
      <Message type="info">{t('addGame.files.torrentStarted')}</Message>

      {torrent ? (
        <>
          <ProgressBar value={torrent.progress} label={t('downloads.title')} />
          <p className="add-game__torrent-stats">
            {(torrent.progress * 100).toFixed(1)}% · {formatTransferred(torrent.downloaded)}
            {torrent.size > 0 ? ` / ${formatTransferred(torrent.size)}` : ''} · ↓ {formatSpeed(torrent.downloadSpeed)} ·{' '}
            {t('downloads.stat.seeds')}: {torrent.seeds} · {t('downloads.stat.peers')}: {torrent.peers}
          </p>
        </>
      ) : null}
    </div>
  );
};
