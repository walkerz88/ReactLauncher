import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { Message } from '@/shared/Message';
import { PathField } from '@/shared/PathField';
import type { PathField as PathFieldName } from '@/electron';

import type { PathsDraft } from '../draft';

export interface PathsStepProps {
  paths: PathsDraft;
  /** Folder name of the game — the default executable is `data/<folder>.exe`. */
  folderId: string;
  onChange: (patch: Partial<PathsDraft>) => void;
  onBrowse: (field: PathFieldName, mode: 'file' | 'folder') => void;
}

interface PathFieldConfig {
  field: keyof PathsDraft & PathFieldName;
  labelKey: string;
  placeholder: string;
  defaultKey: string;
  supportsFolder?: boolean;
}

const FIELDS: PathFieldConfig[] = [
  {
    field: 'exec',
    labelKey: 'editConfig.pathExec',
    placeholder: 'data/game.exe',
    defaultKey: 'addGame.paths.execDefault',
    supportsFolder: true,
  },
  {
    field: 'installer',
    labelKey: 'editConfig.pathInstaller',
    placeholder: 'installer/Setup.exe',
    defaultKey: 'addGame.paths.installerDefault',
    supportsFolder: true,
  },
  {
    field: 'coverHorizontal',
    labelKey: 'editConfig.pathCoverHorizontal',
    placeholder: 'assets/cover_horizontal.jpg',
    defaultKey: 'addGame.paths.coverHorizontalDefault',
  },
  {
    field: 'coverVertical',
    labelKey: 'editConfig.pathCoverVertical',
    placeholder: 'assets/cover_vertical.jpg',
    defaultKey: 'addGame.paths.coverVerticalDefault',
  },
  {
    field: 'settings',
    labelKey: 'editConfig.pathSettings',
    placeholder: 'data/Setup.exe',
    defaultKey: 'addGame.paths.settingsDefault',
    supportsFolder: true,
  },
  {
    field: 'bonus',
    labelKey: 'editConfig.pathBonus',
    placeholder: 'bonus',
    defaultKey: 'addGame.paths.bonusDefault',
    supportsFolder: true,
  },
];

export const PathsStep: FC<PathsStepProps> = ({ paths, folderId, onChange, onBrowse }) => {
  const t = useTranslation();

  return (
    <div className="add-game__step-body" data-id="PathsStep">
      <p className="add-game__intro">{t('addGame.paths.intro')}</p>

      <Message type="warning">{t('addGame.paths.defaultsNote')}</Message>

      {FIELDS.map(({ field, labelKey, placeholder, defaultKey, supportsFolder }) => (
        <div key={field} className="add-game__path">
          <PathField
            label={t(labelKey)}
            placeholder={placeholder}
            value={paths[field]}
            onChange={(value) => onChange({ [field]: value })}
            onBrowse={() => onBrowse(field, 'file')}
            onBrowseFolder={supportsFolder ? () => onBrowse(field, 'folder') : undefined}
          />
          <p className="add-game__default">
            <strong>{t('addGame.paths.ifEmpty')}</strong>{' '}
            {t(defaultKey).replace('{path}', `data/${folderId}.exe`)}
          </p>
        </div>
      ))}
    </div>
  );
};
