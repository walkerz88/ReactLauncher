import { useEffect, useRef, useState, type FC } from 'react';
import { Settings } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { Tooltip } from '@/shared/Tooltip';

export interface GameSettingsMenuProps {
  appId: string;
  hasInstaller: boolean;
  hasSaves: boolean;
  onEditData: () => void;
  onOpenBackups: () => void;
}

/** Gear button for install-related actions ("Установить", "Показать файлы", "Редактировать данные"). */
export const GameSettingsMenu: FC<GameSettingsMenuProps> = ({ appId, hasInstaller, hasSaves, onEditData, onOpenBackups }) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleInstallLocally = () => {
    setOpen(false);
    void window.electronAPI?.content?.openInstaller(appId);
  };

  const handleViewGameFiles = () => {
    setOpen(false);
    void window.electronAPI?.content?.openAppFolder(appId);
  };

  const handleOpenBackups = () => {
    setOpen(false);
    onOpenBackups();
  };

  const handleEditData = () => {
    setOpen(false);
    onEditData();
  };

  return (
    <div className="game-settings-menu" ref={rootRef} data-id="GameSettingsMenu">
      <Tooltip label={t('app.installerMenu')}>
        <button
          type="button"
          className="icon-btn"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          data-gamepad-focusable
        >
          <Settings size={18} />
        </button>
      </Tooltip>

      {open ? (
        <div className="game-settings-menu__dropdown" role="menu">
          {hasInstaller ? (
            <button
              type="button"
              className="game-settings-menu__item"
              role="menuitem"
              onClick={handleInstallLocally}
            >
              {t('app.installLocally')}
            </button>
          ) : null}
          <button
            type="button"
            className="game-settings-menu__item"
            role="menuitem"
            onClick={handleViewGameFiles}
          >
            {t('app.viewDataFiles')}
          </button>
          {hasSaves ? (
            <button
              type="button"
              className="game-settings-menu__item"
              role="menuitem"
              onClick={handleOpenBackups}
            >
              {t('app.backups')}
            </button>
          ) : null}
          <button
            type="button"
            className="game-settings-menu__item"
            role="menuitem"
            onClick={handleEditData}
          >
            {t('app.editData')}
          </button>
        </div>
      ) : null}
    </div>
  );
};
