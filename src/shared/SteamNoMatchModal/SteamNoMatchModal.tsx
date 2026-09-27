import { useState, type FC, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { FormField } from '@/shared/FormField';
import { Modal } from '@/shared/Modal';

import './SteamNoMatchModal.css';

export interface SteamNoMatchModalProps {
  /** Prefills the name field — the search term that just came back empty. */
  initialName: string;
  busy: boolean;
  onContinue: (name: string) => void;
  /** Gives up matching this game to Steam — closes the popup without retrying. In bulk fill this
   * moves on to the next game (same as if the earlier match picker had been cancelled). */
  onSkip: () => void;
  onClose: () => void;
}

/** Shown when a Steam auto-fill search finds nothing at all (e.g. a custom/localized game name) —
 * lets the user retype the name and re-run the search from the same popup, instead of just failing. */
export const SteamNoMatchModal: FC<SteamNoMatchModalProps> = ({ initialName, busy, onContinue, onSkip, onClose }) => {
  const t = useTranslation();
  const [name, setName] = useState(initialName);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) {
      return;
    }

    onContinue(name.trim());
  };

  const footer = (
    <>
      <button type="button" className="btn" onClick={onSkip} disabled={busy} data-gamepad-focusable>
        {t('steamNoMatch.skip')}
      </button>
      <button
        type="submit"
        form="steam-no-match-form"
        className="btn btn--accent"
        disabled={!name.trim() || busy}
        data-gamepad-focusable
      >
        {busy ? <Loader2 size={14} className="steam-no-match-modal__spin" /> : null}
        {t('steamNoMatch.continue')}
      </button>
    </>
  );

  return (
    <Modal title={t('steamNoMatch.title')} ariaLabel={t('steamNoMatch.title')} onClose={onClose} className="steam-no-match-modal" footer={footer}>
      <div data-id="SteamNoMatchModal">
        <p className="steam-no-match-modal__caption">{t('steamNoMatch.caption')}</p>

        <form id="steam-no-match-form" onSubmit={handleSubmit}>
          <FormField label={t('editConfig.name')}>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </FormField>
        </form>
      </div>
    </Modal>
  );
};
