import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const LuckySectionToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.luckyEnabled);
  const setEnabled = useSectionsStore((state) => state.setLuckyEnabled);

  return <SwitchField label={t('nav.lucky')} checked={enabled} onChange={setEnabled} />;
};
