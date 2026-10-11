import { useEffect, useState, type FC } from 'react';
import { FolderOpen, RotateCcw } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { FormField } from '@/shared/FormField';
import { Message } from '@/shared/Message';

export interface DownloadDirStepProps {
  gameId: string;
  /** The folder picked by the user; `null` means the game's own `data/`. */
  downloadDir: string | null;
  /** The download has already started, so the folder can no longer change. */
  locked: boolean;
  onChange: (downloadDir: string | null) => void;
}

export const DownloadDirStep: FC<DownloadDirStepProps> = ({ gameId, downloadDir, locked, onChange }) => {
  const t = useTranslation();
  const [defaultDir, setDefaultDir] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const dir = await window.electronAPI.torrents.defaultDir(gameId);

        if (!cancelled) {
          setDefaultDir(dir);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const pickFolder = async () => {
    try {
      const picked = await window.electronAPI.torrents.pickFolder();

      if (picked) {
        onChange(picked);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const shownDir = downloadDir ?? defaultDir ?? '…';

  return (
    <div className="add-game__step-body" data-id="DownloadDirStep">
      <p className="add-game__intro">{t('addGame.download.intro')}</p>

      <FormField label={t('addGame.download.folder')}>
        <input
          type="text"
          value={downloadDir ? shownDir : `${shownDir} ${t('addGame.download.isDefault')}`}
          readOnly
        />
      </FormField>

      <div className="add-game__download-actions">
        <button type="button" className="btn" disabled={locked} onClick={() => void pickFolder()} data-gamepad-focusable>
          <FolderOpen size={16} />
          {t('addGame.download.choose')}
        </button>
        <button
          type="button"
          className="btn"
          disabled={locked || downloadDir === null}
          onClick={() => onChange(null)}
          data-gamepad-focusable
        >
          <RotateCcw size={16} />
          {t('addGame.download.reset')}
        </button>
      </div>

      {locked ? <Message type="info">{t('addGame.download.locked')}</Message> : null}
    </div>
  );
};
