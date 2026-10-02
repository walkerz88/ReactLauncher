import type { FC } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { FormField } from '@/shared/FormField';
import { Tooltip } from '@/shared/Tooltip';
import { TranslateButton } from '@/shared/TranslateButton';
import type { PreviewNoteType } from '@/electron';

export interface NoteRowValue {
  /** Stable identity for `Reorder.Item`/React keys — unrelated to on-disk order. */
  id: string;
  ru: string;
  en: string;
  type: PreviewNoteType;
}

export interface NoteRowProps {
  note: NoteRowValue;
  onChange: (patch: Partial<NoteRowValue>) => void;
  onRemove: () => void;
}

const NOTE_TYPES: PreviewNoteType[] = ['info', 'success', 'warning', 'error', 'award'];

/** One draggable `previewNotes[]` entry: type, localized text, a remove button and a drag handle. */
export const NoteRow: FC<NoteRowProps> = ({ note, onChange, onRemove }) => {
  const t = useTranslation();
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={note}
      dragListener={false}
      dragControls={dragControls}
      className="edit-config-modal__note"
      data-id="NoteRow"
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

      <div className="edit-config-modal__note-fields">
        <FormField label={t('editConfig.noteType')}>
          <select value={note.type} onChange={(event) => onChange({ type: event.target.value as PreviewNoteType })}>
            {NOTE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`editConfig.noteType${type[0].toUpperCase()}${type.slice(1)}`)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t('editConfig.noteRu')}
          action={<TranslateButton source={note.ru || note.en} target="ru" onApply={(text) => onChange({ ru: text })} />}
        >
          <textarea rows={2} value={note.ru} onChange={(event) => onChange({ ru: event.target.value })} />
        </FormField>

        <FormField
          label={t('editConfig.noteEn')}
          action={<TranslateButton source={note.en || note.ru} target="en" onApply={(text) => onChange({ en: text })} />}
        >
          <textarea rows={2} value={note.en} onChange={(event) => onChange({ en: event.target.value })} />
        </FormField>
      </div>

      <button type="button" className="icon-btn" aria-label={t('editConfig.noteRemove')} onClick={onRemove} data-gamepad-focusable>
        <Trash2 size={16} />
      </button>
    </Reorder.Item>
  );
};
