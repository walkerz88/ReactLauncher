import type { FC } from 'react';

import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/Button';

import './ConfirmModal.css';

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-app replacement for `window.confirm`; focus starts on the cancel button so Enter can't confirm by accident. */
export const ConfirmModal: FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}) => {
  const footer = (
    <>
      <Button type="button" autoFocus onClick={onCancel} data-gamepad-focusable>
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant={danger ? 'danger' : 'accent'}
        onClick={onConfirm}
        data-gamepad-focusable
      >
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal title={title} ariaLabel={title} onClose={onCancel} className="confirm-modal" footer={footer}>
      <p className="confirm-modal__message" data-id="ConfirmModal">
        {message}
      </p>
    </Modal>
  );
};
