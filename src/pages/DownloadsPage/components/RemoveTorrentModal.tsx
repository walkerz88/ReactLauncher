import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import type { TorrentInfo } from '@/electron';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/Button';

export interface RemoveTorrentModalProps {
  torrent: TorrentInfo;
  title: string;
  onRemove: (deleteFiles: boolean) => void;
  onCancel: () => void;
}

export const RemoveTorrentModal: FC<RemoveTorrentModalProps> = ({ torrent, title, onRemove, onCancel }) => {
  const t = useTranslation();
  const heading = t('downloads.removeTitle');

  const footer = (
    <>
      <Button type="button" autoFocus onClick={onCancel} data-gamepad-focusable>
        {t('addGame.cancel')}
      </Button>
      <Button type="button" className="remove-torrent__button" onClick={() => onRemove(false)} data-gamepad-focusable>
        {t('downloads.removeKeep')}
      </Button>
      <Button type="button" variant="danger" className="remove-torrent__button" onClick={() => onRemove(true)} data-gamepad-focusable>
        {t('downloads.removeFiles')}
      </Button>
    </>
  );

  return (
    <Modal title={heading} ariaLabel={heading} onClose={onCancel} className="confirm-modal remove-torrent" footer={footer}>
      <div data-id="RemoveTorrentModal">
        <p className="confirm-modal__message">{t('downloads.removeMessage').replace('{name}', title || torrent.name)}</p>
        <p className="confirm-modal__message remove-torrent__hints">
          {t('downloads.removeKeepHint')}
          <br />
          {t('downloads.removeFilesHint')}
        </p>
      </div>
    </Modal>
  );
};
