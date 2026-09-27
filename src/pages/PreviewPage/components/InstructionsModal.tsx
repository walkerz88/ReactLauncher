import { useEffect, type FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { useTranslation } from '@/app/i18n';
import { reportProgress } from '@/app/lib/progressEvents';
import { Modal } from '@/shared/Modal';

export interface InstructionsModalProps {
  appName: string;
  text: string;
  onClose: () => void;
}

/** Shows an app's setup/compatibility instructions (from `config.json`'s `instructions`), rendered as Markdown. */
export const InstructionsModal: FC<InstructionsModalProps> = ({ appName, text, onClose }) => {
  const t = useTranslation();

  useEffect(() => {
    void reportProgress('feature', 'manual');
  }, []);

  return (
    <Modal title={t('app.instructions')} ariaLabel={`${appName} — ${t('app.instructions')}`} onClose={onClose}>
      <div className="instructions-modal__text" data-id="InstructionsModal">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</ReactMarkdown>
      </div>
    </Modal>
  );
};
