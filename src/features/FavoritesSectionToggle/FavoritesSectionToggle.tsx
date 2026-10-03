import type { FC } from 'react';

import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const FavoritesSectionToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSectionsStore((state) => state.favoritesEnabled);
  const setEnabled = useSectionsStore((state) => state.setFavoritesEnabled);

  return <SwitchField label={t('nav.favorites')} checked={enabled} onChange={setEnabled} />;
};
