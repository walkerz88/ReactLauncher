import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { Modal } from '@/shared/Modal';

export type DeleteScope = 'data' | 'library';

export interface DeleteGameModalProps {
  appName: string;
  hasSaves: boolean;
  onDelete: (scope: DeleteScope) => void;
  onCancel: () => void;
}

/** Asks what to delete: only the installed game data, or the whole game from the library. */
export const DeleteGameModal: FC<DeleteGameModalProps> = ({ appName, hasSaves, onDelete, onCancel }) => {
  const t = useTranslation();
  const title = t('app.deleteTitle');

  const footer = (
    <>
      <button type="button" className="btn" autoFocus onClick={onCancel} data-gamepad-focusable>
        {t('app.deleteCancel')}
      </button>
      <button type="button" className="btn delete-game__button" onClick={() => onDelete('data')} data-gamepad-focusable>
        {t('app.deleteData')}
      </button>
      <button
        type="button"
        className="btn btn--danger delete-game__button"
        onClick={() => onDelete('library')}
        data-gamepad-focusable
      >
        {t('app.deleteLibrary')}
      </button>
    </>
  );

  return (
    <Modal title={title} ariaLabel={title} onClose={onCancel} className="confirm-modal delete-game" footer={footer}>
      <div className="delete-game__body" data-id="DeleteGameModal">
        <p className="confirm-modal__message">{t('app.deleteQuestion').replace('{name}', appName)}</p>
        <p className="confirm-modal__message">{t('app.deleteDataHint')}</p>
        <p className="confirm-modal__message">{t('app.deleteLibraryHint')}</p>
        {hasSaves ? <p className="confirm-modal__message delete-game__warning">{t('app.deleteSavesHint')}</p> : null}
      </div>
    </Modal>
  );
};
