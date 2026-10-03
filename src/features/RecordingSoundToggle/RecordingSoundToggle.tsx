import type { FC } from 'react';

import { useSoundStore } from '@/app/store/soundStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const RecordingSoundToggle: FC = () => {
  const t = useTranslation();
  const enabled = useSoundStore((state) => state.recordingSoundEnabled);
  const setEnabled = useSoundStore((state) => state.setRecordingSoundEnabled);

  return <SwitchField label={t('settings.recordingSound')} checked={enabled} onChange={setEnabled} />;
};
