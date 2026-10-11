import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const TorrentAddToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.torrentEnabled);
  const setEnabled = useSectionsStore((state) => state.setTorrentEnabled);

  return <SwitchField label={t('settings.torrentAdd')} checked={enabled} onChange={setEnabled} />;
};
