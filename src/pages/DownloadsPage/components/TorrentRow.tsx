import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Pause, Play, Trash2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { formatDuration, formatSpeed, formatSwarm, formatTransferred } from '@/app/lib/format';
import type { TorrentInfo } from '@/electron';
import { ProgressBar } from '@/shared/ProgressBar';
import { Tooltip } from '@/shared/Tooltip';
import { IconButton } from '@/shared/IconButton';

export interface TorrentRowProps {
  torrent: TorrentInfo;
  /** Name of the library game the torrent downloads into, if that game is still in the library. */
  gameName: string | null;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRemove: (torrent: TorrentInfo) => void;
  onOpenFolder: (id: string) => void;
}

const ICON_SIZE = 18;

export const TorrentRow: FC<TorrentRowProps> = ({ torrent, gameName, onPause, onResume, onRemove, onOpenFolder }) => {
  const t = useTranslation();
  const { state, progress } = torrent;
  const title = gameName ?? (torrent.name || torrent.id);
  const canResume = state === 'paused' || state === 'error';
  const active = state === 'downloading' || state === 'metadata' || state === 'checking' || state === 'seeding';

  const eta =
    torrent.eta === null ? '—' : torrent.eta < 60 ? t('time.lessThanMinute') : formatDuration(torrent.eta, t);

  return (
    <tr className={['torrent-row', `torrent-row--${state}`].join(' ')} data-id="TorrentRow">
      <td className="torrent-row__actions">
        <div className="torrent-row__buttons">
          {canResume ? (
            <Tooltip label={t('downloads.resume')}>
              <IconButton
                type="button"
                aria-label={t('downloads.resume')}
                onClick={() => onResume(torrent.id)}
                data-gamepad-focusable
              >
                <Play size={ICON_SIZE} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip label={t('downloads.pause')}>
              <IconButton
                type="button"
                aria-label={t('downloads.pause')}
                onClick={() => onPause(torrent.id)}
                data-gamepad-focusable
              >
                <Pause size={ICON_SIZE} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip label={t('downloads.openFolder')}>
            <IconButton
              type="button"
              aria-label={t('downloads.openFolder')}
              onClick={() => onOpenFolder(torrent.id)}
              data-gamepad-focusable
            >
              <FolderOpen size={ICON_SIZE} />
            </IconButton>
          </Tooltip>

          <Tooltip label={t('downloads.remove')}>
            <IconButton
              type="button"
              className="torrent-row__remove"
              aria-label={t('downloads.remove')}
              onClick={() => onRemove(torrent)}
              data-gamepad-focusable
            >
              <Trash2 size={ICON_SIZE} />
            </IconButton>
          </Tooltip>
        </div>
      </td>

      <td className="torrent-row__name">
        {gameName ? (
          <Link to={`/app/${encodeURIComponent(torrent.gameId)}`} className="torrent-row__title" data-gamepad-focusable>
            {title}
          </Link>
        ) : (
          <span className="torrent-row__title">{title}</span>
        )}
        {gameName && torrent.name ? <span className="torrent-row__subtitle">{torrent.name}</span> : null}
        {torrent.error ? <span className="torrent-row__error">{torrent.error}</span> : null}
      </td>

      <td>
        <span className="torrent-row__state">{t(`downloads.state.${state}`)}</span>
      </td>

      <td className="torrent-row__progress">
        <ProgressBar value={progress} label={title} muted={!active} />
        <span className="torrent-row__percent">{(progress * 100).toFixed(1)}%</span>
      </td>

      <td className="torrent-row__number">
        {formatTransferred(torrent.downloaded)} / {torrent.size > 0 ? formatTransferred(torrent.size) : '—'}
      </td>
      <td className="torrent-row__number">{formatSpeed(torrent.downloadSpeed)}</td>
      <td className="torrent-row__number">{formatSpeed(torrent.uploadSpeed)}</td>
      <td className="torrent-row__number">{eta}</td>
      <td className="torrent-row__number" title={t('downloads.swarmHint')}>
        {formatSwarm(torrent.seeds, torrent.swarmSeeds)}
      </td>
      <td className="torrent-row__number" title={t('downloads.swarmHint')}>
        {formatSwarm(torrent.peers, torrent.swarmPeers)}
      </td>
    </tr>
  );
};
