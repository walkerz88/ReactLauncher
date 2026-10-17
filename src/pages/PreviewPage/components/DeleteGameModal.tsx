import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/Button';

export type DeleteScope = 'data' | 'library';

export interface DeleteGameModalProps {
  appName: string;
  /** The game has files in `data/`; without them only removing the whole game makes sense. */
  hasData: boolean;
  hasSaves: boolean;
  onDelete: (scope: DeleteScope) => void;
  onCancel: () => void;
}

/** Asks what to delete: only the installed game data, or the whole game from the library. */
export const DeleteGameModal: FC<DeleteGameModalProps> = ({ appName, hasData, hasSaves, onDelete, onCancel }) => {
  const t = useTranslation();
  const title = t('app.deleteTitle');

  const footer = (
    <>
      <Button type="button" autoFocus onClick={onCancel} data-gamepad-focusable>
        {t('app.deleteCancel')}
      </Button>
      {hasData ? (
        <Button type="button" className="delete-game__button" onClick={() => onDelete('data')} data-gamepad-focusable>
          {t('app.deleteData')}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="danger" className="delete-game__button"
        onClick={() => onDelete('library')}
        data-gamepad-focusable
      >
        {t('app.deleteLibrary')}
      </Button>
    </>
  );

  return (
    <Modal title={title} ariaLabel={title} onClose={onCancel} className="confirm-modal delete-game" footer={footer}>
      <div className="delete-game__body" data-id="DeleteGameModal">
        <p className="confirm-modal__message">
          {(hasData ? t('app.deleteQuestion') : t('app.deleteQuestionNoData')).replace('{name}', appName)}
        </p>
        {hasData ? <p className="confirm-modal__message">{t('app.deleteDataHint')}</p> : null}
        <p className="confirm-modal__message">{t('app.deleteLibraryHint')}</p>
        {hasSaves ? <p className="confirm-modal__message delete-game__warning">{t('app.deleteSavesHint')}</p> : null}
      </div>
    </Modal>
  );
};
