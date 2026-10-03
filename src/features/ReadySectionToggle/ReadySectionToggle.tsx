import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const ReadySectionToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.readyEnabled);
  const setEnabled = useSectionsStore((state) => state.setReadyEnabled);

  return <SwitchField label={t('home.tabs.ready')} checked={enabled} onChange={setEnabled} />;
};
