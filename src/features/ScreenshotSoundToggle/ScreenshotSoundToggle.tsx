import type { FC } from 'react';

import { useSoundStore } from '@/app/store/soundStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const ScreenshotSoundToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSoundStore((state) => state.screenshotSoundEnabled);
  const setEnabled = useSoundStore((state) => state.setScreenshotSoundEnabled);

  return <SwitchField label={t('settings.screenshotSound')} checked={enabled} onChange={setEnabled} />;
};
