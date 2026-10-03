import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';

export const RECORDING_RESOLUTIONS = ['1280x720', '1920x1080', '2560x1440'] as const;
export const RECORDING_FRAME_RATES = [30, 60] as const;

export type RecordingResolution = (typeof RECORDING_RESOLUTIONS)[number];
export type RecordingFrameRate = (typeof RECORDING_FRAME_RATES)[number];

const BITS_PER_SECOND_AT_30_FPS: Record<RecordingResolution, number> = {
  '1280x720': 4_000_000,
  '1920x1080': 8_000_000,
  '2560x1440': 16_000_000,
};

export const getRecordingBitsPerSecond = (resolution: RecordingResolution, frameRate: RecordingFrameRate) =>
  BITS_PER_SECOND_AT_30_FPS[resolution] * (frameRate === 60 ? 1.5 : 1);

export const parseRecordingResolution = (resolution: RecordingResolution) => {
  const [width, height] = resolution.split('x').map(Number);

  return { width, height };
};

export const MIN_RECORDING_SECONDS = 10;
export const MAX_RECORDING_SECONDS = 60;

const isResolution = (value: unknown): value is RecordingResolution =>
  typeof value === 'string' && (RECORDING_RESOLUTIONS as readonly string[]).includes(value);

const isFrameRate = (value: unknown): value is RecordingFrameRate =>
  typeof value === 'number' && (RECORDING_FRAME_RATES as readonly number[]).includes(value);

const isMaxSeconds = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= MIN_RECORDING_SECONDS && value <= MAX_RECORDING_SECONDS;

interface CaptureState {
  recordingResolution: RecordingResolution;
  recordingFrameRate: RecordingFrameRate;
  recordingMaxSeconds: number;
  showRecordingTimer: boolean;
  setRecordingMaxSeconds: (seconds: number) => void;
  setShowRecordingTimer: (show: boolean) => void;
  setRecordingResolution: (resolution: RecordingResolution) => void;
  setRecordingFrameRate: (frameRate: RecordingFrameRate) => void;
}

/** Persisted screen recording settings. Same pattern as the other small settings stores. */
export const useCaptureStore = create<CaptureState>()(
  persist(
    (set) => ({
      recordingResolution: '1920x1080',
      recordingFrameRate: 60,
      recordingMaxSeconds: 20,
      showRecordingTimer: true,
      setRecordingMaxSeconds: (recordingMaxSeconds) => set({ recordingMaxSeconds }),
      setShowRecordingTimer: (showRecordingTimer) => set({ showRecordingTimer }),
      setRecordingResolution: (recordingResolution) => set({ recordingResolution }),
      setRecordingFrameRate: (recordingFrameRate) => set({ recordingFrameRate }),
    }),
    {
      name: 'capture',
      storage: createJSONStorage(() => profileStorage),
      version: 1,
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<CaptureState>;

        return {
          ...current,
          recordingResolution: isResolution(stored.recordingResolution) ? stored.recordingResolution : current.recordingResolution,
          recordingFrameRate: isFrameRate(stored.recordingFrameRate) ? stored.recordingFrameRate : current.recordingFrameRate,
          recordingMaxSeconds: isMaxSeconds(stored.recordingMaxSeconds) ? stored.recordingMaxSeconds : current.recordingMaxSeconds,
          showRecordingTimer: typeof stored.showRecordingTimer === 'boolean' ? stored.showRecordingTimer : current.showRecordingTimer,
        };
      },
    },
  ),
);
