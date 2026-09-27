import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { Modal } from '@/shared/Modal';
import type { SteamSearchResult } from '@/electron';

import './SteamPickerModal.css';

export interface SteamPickerModalProps {
  results: SteamSearchResult[];
  busy: boolean;
  /** Overrides the default title — bulk fill passes the current game's name in. */
  title?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** Shown by a Steam auto-fill ("Автоматически") when the search found no single confident name
 * match — lets the user pick the right game instead of the fill silently guessing or giving up.
 * Shared by the single-game edit modal and the library health page's bulk fill, one game at a time. */
export const SteamPickerModal: FC<SteamPickerModalProps> = ({ results, busy, title, onPick, onClose }) => {
  const t = useTranslation();
  const resolvedTitle = title ?? t('steamPicker.title');

  const footer = (
    <button type="button" className="btn" onClick={onClose} disabled={busy} data-gamepad-focusable>
      {t('steamPicker.cancel')}
    </button>
  );

  return (
    <Modal title={resolvedTitle} ariaLabel={resolvedTitle} onClose={onClose} className="steam-picker-modal" footer={footer}>
      <div data-id="SteamPickerModal">
        <p className="steam-picker-modal__caption">{t('steamPicker.caption')}</p>

        <ul className="steam-picker-modal__results">
          {results.map(({ id, name }) => (
            <li key={id}>
              <button
                type="button"
                className="steam-picker-modal__result"
                disabled={busy}
                onClick={() => onPick(id)}
                data-gamepad-focusable
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};
