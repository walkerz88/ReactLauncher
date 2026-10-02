import { useState, type FC } from 'react';
import { Languages, Loader2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { useNotificationStore } from '@/app/store/notificationStore';
import { FormField } from '@/shared/FormField';
import { Modal } from '@/shared/Modal';
import { Tooltip } from '@/shared/Tooltip';

import './TranslateButton.css';

export interface TranslateButtonProps {
  /** Text to translate — the field's own text, or the other language's when the field is empty. */
  source: string;
  target: 'ru' | 'en';
  onApply: (text: string) => void;
}

/** Icon button next to a localized field: translates `source` into `target`, shows the result in an
 * editable preview, and only writes it into the field once the user accepts. */
export const TranslateButton: FC<TranslateButtonProps> = ({ source, target, onApply }) => {
  const t = useTranslation();
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTranslate = async () => {
    setBusy(true);

    try {
      const translated = await window.electronAPI?.translate.text(source, target);

      if (translated == null) {
        pushNotification(t('translate.failed'), 'error');
      } else {
        setResult(translated);
      }
    } catch (err) {
      console.error('Translation failed:', err);
      pushNotification(t('translate.failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleApply = () => {
    if (result != null) {
      onApply(result);
    }

    setResult(null);
  };

  const footer = (
    <>
      <button type="button" className="btn" onClick={() => setResult(null)} data-gamepad-focusable>
        {t('translate.cancel')}
      </button>
      <button type="button" className="btn btn--accent" onClick={handleApply} data-gamepad-focusable>
        {t('translate.apply')}
      </button>
    </>
  );

  return (
    <>
      <Tooltip label={t('translate.button')}>
        <button
          type="button"
          className="icon-btn translate-button"
          aria-label={t('translate.button')}
          disabled={busy || !source.trim()}
          onClick={() => void handleTranslate()}
          data-id="TranslateButton"
          data-gamepad-focusable
        >
          {busy ? <Loader2 size={14} className="translate-button__spin" /> : <Languages size={14} />}
        </button>
      </Tooltip>

      {result != null ? (
        <Modal
          title={t('translate.title')}
          ariaLabel={t('translate.title')}
          onClose={() => setResult(null)}
          closeOnOverlayClick={false}
          footer={footer}
        >
          <FormField label={t(`translate.result.${target}`)}>
            <textarea rows={10} value={result} onChange={(event) => setResult(event.target.value)} />
          </FormField>
        </Modal>
      ) : null}
    </>
  );
};
