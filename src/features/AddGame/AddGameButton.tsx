import { useState, type FC } from 'react';
import { Plus } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { Tooltip } from '@/shared/Tooltip';

import { AddGameWizard } from './AddGameWizard';

export interface AddGameButtonProps {
  /** Extra class(es) on the button itself — e.g. the sidebar's own `--push` spacer modifier. */
  className?: string;
}

/** Sidebar button (above "Обновить библиотеку") that opens the "add a game" wizard. */
export const AddGameButton: FC<AddGameButtonProps> = ({ className }) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip label={t('addGame.button')} placement="right">
        <button
          type="button"
          className={['app-navigation__item', className].filter(Boolean).join(' ')}
          onClick={() => setOpen(true)}
          aria-label={t('addGame.button')}
          data-id="AddGameButton"
          data-gamepad-focusable
        >
          <Plus size={22} />
        </button>
      </Tooltip>

      {open ? <AddGameWizard onClose={() => setOpen(false)} /> : null}
    </>
  );
};
