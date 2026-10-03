import type { FC } from 'react';

import {
  RECORDING_FRAME_RATES,
  MAX_RECORDING_SECONDS,
  MIN_RECORDING_SECONDS,
  RECORDING_RESOLUTIONS,
  useCaptureStore,
  type RecordingFrameRate,
  type RecordingResolution,
} from '@/app/store/captureStore';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';
import { ToggleGroup, type ToggleGroupOption } from '@/shared/ToggleGroup';

import './RecordingQuality.css';

export const RecordingQuality: FC = () => {
  const t = useTranslation();
  const resolution = useCaptureStore((state) => state.recordingResolution);
  const frameRate = useCaptureStore((state) => state.recordingFrameRate);
  const maxSeconds = useCaptureStore((state) => state.recordingMaxSeconds);
  const setMaxSeconds = useCaptureStore((state) => state.setRecordingMaxSeconds);
  const showTimer = useCaptureStore((state) => state.showRecordingTimer);
  const setShowTimer = useCaptureStore((state) => state.setShowRecordingTimer);
  const setResolution = useCaptureStore((state) => state.setRecordingResolution);
  const setFrameRate = useCaptureStore((state) => state.setRecordingFrameRate);

  const resolutionOptions: ToggleGroupOption<RecordingResolution>[] = RECORDING_RESOLUTIONS.map((value) => ({
    value,
    label: value.replace('x', '×'),
  }));

  const frameRateOptions: ToggleGroupOption<`${RecordingFrameRate}`>[] = RECORDING_FRAME_RATES.map((value) => ({
    value: `${value}`,
    label: `${value} ${t('settings.recordingFpsUnit')}`,
  }));

  return (
    <div className="recording-quality" data-id="RecordingQuality">
      <ToggleGroup
        options={resolutionOptions}
        value={resolution}
        ariaLabel={t('settings.recordingResolution')}
        onChange={setResolution}
      />
      <ToggleGroup
        options={frameRateOptions}
        value={`${frameRate}`}
        ariaLabel={t('settings.recordingFrameRate')}
        onChange={(value) => setFrameRate(value === '60' ? 60 : 30)}
      />
      <label className="recording-quality__length">
        <span>{t('settings.recordingMaxLength')}</span>
        <input
          type="range"
          value={maxSeconds}
          min={MIN_RECORDING_SECONDS}
          max={MAX_RECORDING_SECONDS}
          step={5}
          onChange={(event) => setMaxSeconds(Number(event.target.value))}
        />
        <span className="recording-quality__length-value">
          {maxSeconds} {t('settings.recordingSecondsUnit')}
        </span>
      </label>
      <SwitchField label={t('settings.recordingTimer')} checked={showTimer} onChange={setShowTimer} />
      <p className="recording-quality__hint">{t('settings.recordingQualityHint')}</p>
    </div>
  );
};
