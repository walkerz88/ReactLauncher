import type { FC } from 'react';
import { File, FolderOpen } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { FormField } from '@/shared/FormField';
import { Tooltip } from '@/shared/Tooltip';

import './PathField.css';

export interface PathFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Omit for a field that only ever points at a folder — its file-picker button is hidden too. */
  onBrowse?: () => void;
  /** Shows a second button that opens a folder picker instead of a file one. */
  onBrowseFolder?: () => void;
}

/** A relative-path text input plus one or two buttons opening a native file/folder picker. */
export const PathField: FC<PathFieldProps> = ({ label, placeholder, value, onChange, onBrowse, onBrowseFolder }) => {
  const t = useTranslation();

  return (
    <FormField label={label}>
      <div className="path-field__row" data-id="PathField">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {onBrowse ? (
          <Tooltip label={t('editConfig.browseFile')}>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('editConfig.browseFile')}
              onClick={onBrowse}
              data-gamepad-focusable
            >
              <File size={16} />
            </button>
          </Tooltip>
        ) : null}
        {onBrowseFolder ? (
          <Tooltip label={t('editConfig.browseFolder')}>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('editConfig.browseFolder')}
              onClick={onBrowseFolder}
              data-gamepad-focusable
            >
              <FolderOpen size={16} />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </FormField>
  );
};
