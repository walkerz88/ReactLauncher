import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { ConfirmModal } from '@/shared/ConfirmModal';

export interface ExitConfirmModalProps {
  onCancel: () => void;
}

export const ExitConfirmModal: FC<ExitConfirmModalProps> = ({ onCancel }) => {
  const t = useTranslation();

  return (
    <ConfirmModal
      title={t('nav.exitTitle')}
      message={t('nav.exitConfirm')}
      confirmLabel={t('nav.exit')}
      cancelLabel={t('nav.exitCancel')}
      danger
      onConfirm={() => window.electronAPI?.quit()}
      onCancel={onCancel}
    />
  );
};
