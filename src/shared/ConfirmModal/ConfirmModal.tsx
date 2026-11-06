import type { FC, ReactNode } from 'react';

import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/Button';
import { Message } from '@/shared/Message';

import './ConfirmModal.css';

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
  /** Additional buttons rendered on the left side of the footer. */
  leftActions?: ReactNode;
  /** Additional CSS class for the modal. */
  className?: string;
  /** Info message shown below the main message (styled as info Message). */
  infoMessage?: string;
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
  leftActions,
  className,
  infoMessage,
  onConfirm,
  onCancel,
}) => {
  const footer = (
    <>
      {leftActions ? <span className="confirm-modal__left-actions">{leftActions}</span> : null}
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
    <Modal
      title={title}
      ariaLabel={title}
      onClose={onCancel}
      className={['confirm-modal', className].filter(Boolean).join(' ')}
      footer={footer}
    >
      <p className="confirm-modal__message" data-id="ConfirmModal">
        {message}
      </p>
      {infoMessage ? <Message type="info">{infoMessage}</Message> : null}
    </Modal>
  );
};
