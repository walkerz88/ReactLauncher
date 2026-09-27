import { useEffect, useState, type FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { Message } from '@/shared/Message';

export interface StructureStepProps {
  libraryDir: string | null;
  /** The game title from step one — the folder name is derived from it. */
  title: string;
}

export const StructureStep: FC<StructureStepProps> = ({ libraryDir, title }) => {
  const t = useTranslation();
  const [folderName, setFolderName] = useState<string | null>(null);
  const separator = libraryDir?.includes('\\') ? '\\' : '/';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const name = await window.electronAPI.content.folderName(title);

        if (!cancelled) {
          setFolderName(name);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [title]);

  const shownName = folderName ?? '…';

  return (
    <div className="add-game__step-body" data-id="StructureStep">
      <p className="add-game__intro">{t('addGame.structure.intro')}</p>

      {libraryDir && folderName ? (
        <p className="add-game__location">
          {t('addGame.structure.location')} <code>{`${libraryDir}${separator}${folderName}`}</code>
        </p>
      ) : null}

      <pre className="add-game__tree">
        {`${shownName}/\n`}
        {`├─ config.json   — ${t('addGame.structure.treeConfig')}\n`}
        {`├─ data/         — ${t('addGame.structure.treeData')}\n`}
        {`├─ assets/       — ${t('addGame.structure.treeAssets')}\n`}
        {`├─ screenshots/  — ${t('addGame.structure.treeScreenshots')}\n`}
        {`├─ installer/    — ${t('addGame.structure.treeInstaller')}\n`}
        {`└─ bonus/        — ${t('addGame.structure.treeBonus')}`}
      </pre>

      <Message type="warning">{t('addGame.structure.warning')}</Message>
    </div>
  );
};
