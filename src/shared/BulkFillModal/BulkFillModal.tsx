import { useState, type FC } from 'react';
import { Loader2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { Modal } from '@/shared/Modal';
import { TristateCheckbox } from '@/shared/TristateCheckbox';

import './BulkFillModal.css';

export interface FillFields {
  description: boolean;
  facts: boolean;
  genre: boolean;
  rating: boolean;
  coverHorizontal: boolean;
  coverVertical: boolean;
  trailer: boolean;
  screenshots: boolean;
}

const DEFAULT_FIELDS: FillFields = {
  description: true,
  facts: true,
  genre: true,
  rating: true,
  coverHorizontal: true,
  coverVertical: true,
  trailer: true,
  screenshots: true,
};

const FIELD_ORDER: Array<{ key: keyof FillFields; labelKey: string }> = [
  { key: 'description', labelKey: 'health.fillPopup.description' },
  { key: 'facts', labelKey: 'health.fillPopup.facts' },
  { key: 'genre', labelKey: 'health.fillPopup.genre' },
  { key: 'rating', labelKey: 'health.fillPopup.rating' },
  { key: 'coverHorizontal', labelKey: 'health.fillPopup.coverHorizontal' },
  { key: 'coverVertical', labelKey: 'health.fillPopup.coverVertical' },
  { key: 'trailer', labelKey: 'health.fillPopup.trailer' },
  { key: 'screenshots', labelKey: 'health.fillPopup.screenshots' },
];

export interface BulkFillModalProps {
  /** How many games this run applies to — 1 for a single game's own "Автоматически" button. */
  count: number;
  onClose: () => void;
  onConfirm: (fields: FillFields) => void;
  /** Shows a loader on the confirm button and keeps the modal open instead of closing it right away —
   * for the single-game flow, which needs the Steam search to finish before it can show the match picker. */
  busy?: boolean;
}

/** Popup shared by the library health list's and a single game's "Автоматически"/"Дозаполнить" action —
 * picks exactly which fields the Steam auto-fill should touch, so a hand-written description or an
 * existing cover is never overwritten by accident. */
export const BulkFillModal: FC<BulkFillModalProps> = ({ count, onClose, onConfirm, busy = false }) => {
  const t = useTranslation();
  const [fields, setFields] = useState<FillFields>(DEFAULT_FIELDS);

  const setField = (key: keyof FillFields, value: boolean) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const toggleAll = (checked: boolean) => {
    setFields(
      FIELD_ORDER.reduce((acc, { key }) => ({ ...acc, [key]: checked }), {} as FillFields),
    );
  };

  const hasSelection = FIELD_ORDER.some(({ key }) => fields[key]);
  const allSelected = FIELD_ORDER.every(({ key }) => fields[key]);
  const someSelected = hasSelection && !allSelected;

  const footer = (
    <>
      <button type="button" className="btn" onClick={onClose} data-gamepad-focusable>
        {t('health.fillPopup.cancel')}
      </button>
      <button
        type="button"
        className="btn btn--accent"
        disabled={!hasSelection || busy}
        onClick={() => onConfirm(fields)}
        data-gamepad-focusable
      >
        {busy ? <Loader2 size={14} className="bulk-fill-modal__spin" /> : null}
        {t('health.fillPopup.confirm')}
      </button>
    </>
  );

  return (
    <Modal
      title={t('health.fillPopup.title').replace('{count}', String(count))}
      ariaLabel={t('health.fillPopup.title').replace('{count}', String(count))}
      onClose={onClose}
      className="bulk-fill-modal"
      footer={footer}
    >
      <div data-id="BulkFillModal">
        <p className="bulk-fill-modal__caption">{t('health.fillPopup.caption')}</p>

        <table className="bulk-fill-modal__table">
          <thead>
            <tr className="bulk-fill-modal__row">
              <td className="bulk-fill-modal__col-checkbox">
                <TristateCheckbox
                  id="bulk-fill-all"
                  checked={allSelected}
                  indeterminate={someSelected}
                  ariaLabel={t('health.fillPopup.selectAll')}
                  onChange={toggleAll}
                />
              </td>
              <td>
                <label htmlFor="bulk-fill-all">{t('health.fillPopup.selectAll')}</label>
              </td>
            </tr>
          </thead>

          <tbody>
            {FIELD_ORDER.map(({ key, labelKey }) => {
              const inputId = `bulk-fill-${key}`;

              return (
                <tr key={key} className="bulk-fill-modal__row">
                  <td className="bulk-fill-modal__col-checkbox">
                    <input
                      id={inputId}
                      type="checkbox"
                      className="bulk-fill-modal__checkbox"
                      checked={fields[key]}
                      onChange={(event) => setField(key, event.target.checked)}
                      data-gamepad-focusable
                    />
                  </td>
                  <td>
                    <label htmlFor={inputId}>{t(labelKey)}</label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
