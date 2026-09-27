import { useEffect, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { useTranslation } from '@/app/i18n';

import './Modal.css';

export interface ModalProps {
  title: string;
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra class on the dialog box itself (e.g. `readme-modal` for content-specific rules). */
  className?: string;
  /** Set to `false` for forms where an accidental outside click shouldn't discard input. Defaults to `true`. */
  closeOnOverlayClick?: boolean;
}

/** Portal-rendered dialog: backdrop, header with title/close, scrollable body, optional footer. Closes on Escape or a backdrop click. */
export const Modal: FC<ModalProps> = ({
  title,
  ariaLabel,
  onClose,
  children,
  footer,
  className,
  closeOnOverlayClick = true,
}) => {
  const t = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="modal__backdrop" onClick={closeOnOverlayClick ? onClose : undefined}>
      <div
        className={['modal', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-id="Modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t('modal.close')}
            data-gamepad-focusable
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
};
