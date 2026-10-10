import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const AddGameSectionToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.addGameEnabled);
  const setEnabled = useSectionsStore((state) => state.setAddGameEnabled);

  return <SwitchField label={t('addGame.button')} checked={enabled} onChange={setEnabled} />;
};
