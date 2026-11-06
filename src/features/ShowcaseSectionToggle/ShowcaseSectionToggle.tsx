import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const ShowcaseSectionToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.showcaseEnabled);
  const setEnabled = useSectionsStore((state) => state.setShowcaseEnabled);

  return <SwitchField label={t('nav.showcase')} checked={enabled} onChange={setEnabled} />;
};
