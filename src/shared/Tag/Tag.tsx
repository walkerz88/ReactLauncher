import type { FC } from 'react';
import { X } from 'lucide-react';

import './Tag.css';

export interface TagProps {
  label: string;
  /** Tooltip of the label when it is clickable. */
  title?: string;
  /** Accessible name of the remove button. */
  removeLabel?: string;
  onClick?: () => void;
  onRemove?: () => void;
}

export const Tag: FC<TagProps> = ({ label, title, removeLabel, onClick, onRemove }) => {
  const className = ['tag', onClick ? 'tag--clickable' : '', onRemove ? 'tag--removable' : ''].filter(Boolean).join(' ');

  return (
    <span className={className} data-id="Tag">
      {onClick ? (
        <button type="button" className="tag__label" title={title} onClick={onClick} data-gamepad-focusable>
          {label}
        </button>
      ) : (
        label
      )}

      {onRemove ? (
        <button type="button" className="tag__remove" aria-label={removeLabel} onClick={onRemove}>
          <X size={12} />
        </button>
      ) : null}
    </span>
  );
};
