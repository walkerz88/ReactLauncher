import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const InstallableSectionToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.installableEnabled);
  const setEnabled = useSectionsStore((state) => state.setInstallableEnabled);

  return <SwitchField label={t('home.tabs.installable')} checked={enabled} onChange={setEnabled} />;
};
