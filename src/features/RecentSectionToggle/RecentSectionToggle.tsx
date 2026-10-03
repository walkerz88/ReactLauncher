import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const RecentSectionToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.recentEnabled);
  const setEnabled = useSectionsStore((state) => state.setRecentEnabled);

  return <SwitchField label={t('home.tabs.recent')} checked={enabled} onChange={setEnabled} />;
};
