import { useEffect, useState, type FC } from 'react';
import { FileDown, X } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { formatFileSize } from '@/app/lib/format';
import { FormField } from '@/shared/FormField';
import { Message } from '@/shared/Message';

import { toTorrentSource, type TorrentDraft } from '../draft';

export interface TorrentStepProps {
  torrent: TorrentDraft;
  onChange: (patch: Partial<TorrentDraft>) => void;
  /** Called with the torrent's own name once it is recognized, so the next step can start with it. */
  onSuggestName: (name: string) => void;
}

const INSPECT_DELAY_MS = 300;

export const TorrentStep: FC<TorrentStepProps> = ({ torrent, onChange, onSuggestName }) => {
  const t = useTranslation();
  const [invalid, setInvalid] = useState(false);
  const { magnet, file, info } = torrent;

  useEffect(() => {
    const source = toTorrentSource(torrent);

    if (!source) {
      setInvalid(false);
      onChange({ info: null });

      return undefined;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        const result = await window.electronAPI.torrents.inspect(source);

        if (cancelled) {
          return;
        }

        if (result.ok) {
          setInvalid(false);
          onChange({ info: result.torrent });

          if (result.torrent.name) {
            onSuggestName(result.torrent.name);
          }
        } else {
          setInvalid(true);
          onChange({ info: null });
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setInvalid(true);
          onChange({ info: null });
        }
      }
    }, INSPECT_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Only the source itself matters: `onChange` / `onSuggestName` are new functions on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnet, file?.path]);

  const pickFile = async () => {
    try {
      const picked = await window.electronAPI.torrents.pickFile();

      if (picked) {
        onChange({ file: picked, magnet: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="add-game__step-body" data-id="TorrentStep">
      {file ? (
        <div className="add-game__file-chip">
          <FileDown size={18} />
          <span className="add-game__file-name">{file.name}</span>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('addGame.torrent.removeFile')}
            onClick={() => onChange({ file: null })}
            data-gamepad-focusable
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn add-game__action"
          onClick={() => void pickFile()}
          autoFocus
          data-gamepad-focusable
        >
          <FileDown size={16} />
          {t('addGame.torrent.pickFile')}
        </button>
      )}

      <div className="add-game__or">{t('addGame.torrent.or')}</div>

      <FormField label={t('addGame.torrent.magnetLabel')}>
        <input
          type="text"
          value={magnet}
          placeholder="magnet:?xt=urn:btih:…"
          disabled={Boolean(file)}
          onChange={(event) => onChange({ magnet: event.target.value })}
        />
      </FormField>

      {invalid ? <Message type="error">{t('addGame.torrent.invalid')}</Message> : null}

      {info ? (
        <Message type="success">
          {t('addGame.torrent.recognized')}
          {info.name ? `: ${info.name}` : ''} (
          {info.size !== null ? formatFileSize(info.size) : t('addGame.torrent.sizeUnknown')})
        </Message>
      ) : null}
    </div>
  );
};
