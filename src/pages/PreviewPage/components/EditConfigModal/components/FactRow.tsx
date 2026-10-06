import type { FC } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Trash2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { FormField } from '@/shared/FormField';
import { Tooltip } from '@/shared/Tooltip';
import { TranslateButton } from '@/shared/TranslateButton';

export interface FactRowValue {
  /** Stable identity for `Reorder.Item`/React keys — unrelated to on-disk order. */
  id: string;
  labelRu: string;
  labelEn: string;
  valueRu: string;
  valueEn: string;
}

export interface FactRowProps {
  fact: FactRowValue;
  onChange: (patch: Partial<FactRowValue>) => void;
  onRemove: () => void;
}

/** One draggable `facts[]` entry: a localized label/value pair, a remove button and a drag handle. */
export const FactRow: FC<FactRowProps> = ({ fact, onChange, onRemove }) => {
  const t = useTranslation();
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={fact}
      dragListener={false}
      dragControls={dragControls}
      className="edit-config-modal__fact"
      data-id="FactRow"
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
        <FormField
          label={t('editConfig.factLabelRu')}
          action={
            <TranslateButton
              source={fact.labelRu || fact.labelEn}
              target="ru"
              onApply={(text) => onChange({ labelRu: text })}
            />
          }
        >
          <input
            type="text"
            placeholder="Год выхода"
            value={fact.labelRu}
            onChange={(event) => onChange({ labelRu: event.target.value })}
          />
        </FormField>

        <FormField
          label={t('editConfig.factLabelEn')}
          action={
            <TranslateButton
              source={fact.labelEn || fact.labelRu}
              target="en"
              onApply={(text) => onChange({ labelEn: text })}
            />
          }
        >
          <input
            type="text"
            placeholder="Release year"
            value={fact.labelEn}
            onChange={(event) => onChange({ labelEn: event.target.value })}
          />
        </FormField>

        <FormField label={t('editConfig.factValueRu')}>
          <input
            type="text"
            value={fact.valueRu}
            onChange={(event) => onChange({ valueRu: event.target.value })}
          />
        </FormField>

        <FormField label={t('editConfig.factValueEn')}>
          <input
            type="text"
            value={fact.valueEn}
            onChange={(event) => onChange({ valueEn: event.target.value })}
          />
        </FormField>
      </div>

      <button type="button" className="icon-btn" aria-label={t('editConfig.factRemove')} onClick={onRemove} data-gamepad-focusable>
        <Trash2 size={16} />
      </button>
    </Reorder.Item>
  );
};
