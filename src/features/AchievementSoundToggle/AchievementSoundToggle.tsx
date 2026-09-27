import type { FC } from 'react';

import { useSoundStore } from '@/app/store/soundStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const AchievementSoundToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSoundStore((state) => state.achievementSoundEnabled);
  const setEnabled = useSoundStore((state) => state.setAchievementSoundEnabled);

  return <SwitchField label={t('settings.achievementSound')} checked={enabled} onChange={setEnabled} />;
};
