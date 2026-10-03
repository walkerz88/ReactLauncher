import type { FC } from 'react';

import { useCardsStore } from '@/app/store/cardsStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const CardsSettings: FC = () => {
  const t = useTranslation();
  const previewTrailer = useCardsStore((state) => state.previewTrailer);
  const animateOnHover = useCardsStore((state) => state.animateOnHover);
  const setPreviewTrailer = useCardsStore((state) => state.setPreviewTrailer);
  const setAnimateOnHover = useCardsStore((state) => state.setAnimateOnHover);

  return (
    <div data-id="CardsSettings">
      <SwitchField label={t('settings.cardsTrailer')} checked={previewTrailer} onChange={setPreviewTrailer} />
      <SwitchField label={t('settings.cardsAnimate')} checked={animateOnHover} onChange={setAnimateOnHover} />
    </div>
  );
};
