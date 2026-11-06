import { useEffect, type FC, type ReactNode } from 'react';
import { X } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { IconButton } from '@/shared/IconButton';

import './SidePanel.css';

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const SidePanel: FC<SidePanelProps> = ({ open, onClose, title, children }) => {
  const t = useTranslation();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={['side-panel__backdrop', open ? 'side-panel__backdrop--visible' : ''].filter(Boolean).join(' ')}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={['side-panel', open ? 'side-panel--open' : ''].filter(Boolean).join(' ')}
        data-id="SidePanel"
      >
        <div className="side-panel__header">
          {title ? <h2 className="side-panel__title">{title}</h2> : null}
          <IconButton onClick={onClose} aria-label={t('modal.close')}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="side-panel__body">{children}</div>
      </div>
    </>
  );
};
