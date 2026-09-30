import type { FC } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { File, FolderOpen, GripVertical, Trash2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { FormField } from '@/shared/FormField';
import { Tooltip } from '@/shared/Tooltip';

export interface CustomButtonRowValue {
  /** Stable identity for `Reorder.Item`/React keys — unrelated to on-disk order. */
  id: string;
  labelRu: string;
  labelEn: string;
  path: string;
}

export interface CustomButtonRowProps {
  button: CustomButtonRowValue;
  onChange: (patch: Partial<CustomButtonRowValue>) => void;
  onRemove: () => void;
  onBrowse: (mode: 'file' | 'folder') => void;
}

/** One draggable `customButtons[]` entry: a localized label and a file-or-folder path, with the remove
 * button sitting right next to the path's own file/folder browse buttons (same size, same row). */
export const CustomButtonRow: FC<CustomButtonRowProps> = ({ button, onChange, onRemove, onBrowse }) => {
  const t = useTranslation();
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={button}
      dragListener={false}
      dragControls={dragControls}
      className="edit-config-modal__fact"
      data-id="CustomButtonRow"
    >
      <Tooltip label={t('editConfig.noteReorder')}>
        <button
          type="button"
          className="edit-config-modal__handle"
          aria-label={t('editConfig.noteReorder')}
          onPointerDown={(event) => dragControls.start(event)}
          data-gamepad-focusable
        >
          <GripVertical size={16} />
        </button>
      </Tooltip>

      <div className="edit-config-modal__fact-fields">
        <FormField label={t('editConfig.customButtonLabelRu')}>
          <input
            type="text"
            placeholder="Мод-менеджер"
            value={button.labelRu}
            onChange={(event) => onChange({ labelRu: event.target.value })}
          />
        </FormField>

        <FormField label={t('editConfig.customButtonLabelEn')}>
          <input
            type="text"
            placeholder="Mod manager"
            value={button.labelEn}
            onChange={(event) => onChange({ labelEn: event.target.value })}
          />
        </FormField>

        <div className="edit-config-modal__custom-button-path">
          <FormField label={t('editConfig.customButtonPath')}>
            <div className="path-field__row">
              <input
                type="text"
                placeholder="data/ModManager.exe"
                value={button.path}
                onChange={(event) => onChange({ path: event.target.value })}
              />
              <Tooltip label={t('editConfig.browseFile')}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('editConfig.browseFile')}
                  onClick={() => onBrowse('file')}
                  data-gamepad-focusable
                >
                  <File size={16} />
                </button>
              </Tooltip>
              <Tooltip label={t('editConfig.browseFolder')}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('editConfig.browseFolder')}
                  onClick={() => onBrowse('folder')}
                  data-gamepad-focusable
                >
                  <FolderOpen size={16} />
                </button>
              </Tooltip>
              <Tooltip label={t('editConfig.customButtonRemove')}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('editConfig.customButtonRemove')}
                  onClick={onRemove}
                  data-gamepad-focusable
                >
                  <Trash2 size={16} />
                </button>
              </Tooltip>
            </div>
          </FormField>
        </div>
      </div>
    </Reorder.Item>
  );
};
