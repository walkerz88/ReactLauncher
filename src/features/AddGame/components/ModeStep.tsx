import type { FC } from 'react';
import { FolderPlus, Magnet } from 'lucide-react';

import { useTranslation } from '@/app/i18n';

import type { AddMode } from '../draft';

export interface ModeStepProps {
  onSelect: (mode: AddMode) => void;
}

const MODES = [
  { id: 'manual', Icon: FolderPlus, titleKey: 'addGame.mode.manual', hintKey: 'addGame.mode.manualHint' },
  { id: 'torrent', Icon: Magnet, titleKey: 'addGame.mode.torrent', hintKey: 'addGame.mode.torrentHint' },
] as const;

export const ModeStep: FC<ModeStepProps> = ({ onSelect }) => {
  const t = useTranslation();

  return (
    <div className="add-game__step-body" data-id="ModeStep">
      <p className="add-game__intro">{t('addGame.mode.intro')}</p>

      <div className="add-game__modes">
        {MODES.map(({ id, Icon, titleKey, hintKey }) => (
          <button
            key={id}
            type="button"
            className="add-game__mode"
            onClick={() => onSelect(id)}
            data-gamepad-focusable
          >
            <span className="add-game__mode-icon">
              <Icon size={34} />
            </span>
            <span className="add-game__mode-title">{t(titleKey)}</span>
            <span className="add-game__mode-hint">{t(hintKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
