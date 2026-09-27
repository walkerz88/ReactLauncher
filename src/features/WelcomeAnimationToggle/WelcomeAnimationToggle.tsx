import type { FC } from 'react';

import { useWelcomeAnimationStore } from '@/app/store/welcomeAnimationStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const WelcomeAnimationToggle: FC = () => {
  const t = useTranslation();
  const enabled = useWelcomeAnimationStore((state) => state.enabled);
  const setEnabled = useWelcomeAnimationStore((state) => state.setEnabled);

  return <SwitchField label={t('settings.welcomeAnimation')} checked={enabled} onChange={setEnabled} />;
};
