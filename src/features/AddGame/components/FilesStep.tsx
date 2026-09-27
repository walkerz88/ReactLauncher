import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { Message } from '@/shared/Message';

export interface FilesStepProps {
  assetsStatus: 'idle' | 'loading' | 'done' | 'failed';
}

const FOLDERS = [
  { name: 'data/', textKey: 'addGame.files.data' },
  { name: 'assets/', textKey: 'addGame.files.assets' },
  { name: 'screenshots/', textKey: 'addGame.files.screenshots' },
  { name: 'installer/', textKey: 'addGame.files.installer' },
  { name: 'bonus/', textKey: 'addGame.files.bonus' },
];

export const FilesStep: FC<FilesStepProps> = ({ assetsStatus }) => {
  const t = useTranslation();

  return (
    <div className="add-game__step-body" data-id="FilesStep">
      <p className="add-game__intro">{t('addGame.files.intro')}</p>

      <Message type="info">{t('addGame.files.tip')}</Message>

      {assetsStatus === 'loading' ? <Message loading>{t('addGame.files.assetsLoading')}</Message> : null}
      {assetsStatus === 'done' ? <Message type="success">{t('addGame.files.assetsDone')}</Message> : null}
      {assetsStatus === 'failed' ? <Message type="warning">{t('addGame.files.assetsFailed')}</Message> : null}

      <ul className="add-game__folders">
        {FOLDERS.map(({ name, textKey }) => (
          <li key={name} className="add-game__folder">
            <code className="add-game__folder-name">{name}</code>
            <span>{t(textKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
