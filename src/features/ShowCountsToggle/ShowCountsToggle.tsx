import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const ShowCountsToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.showCounts);
  const setEnabled = useSectionsStore((state) => state.setShowCounts);

  return <SwitchField label={t('settings.showCounts')} checked={enabled} onChange={setEnabled} />;
};
