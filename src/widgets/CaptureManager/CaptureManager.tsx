import { useEffect, useRef, type FC } from 'react';

import { playRecordingStartSound, playRecordingStopSound, playScreenshotSound } from '@/app/lib/captureSound';
import { getRecordingBitsPerSecond, parseRecordingResolution, useCaptureStore } from '@/app/store/captureStore';
import { useSoundStore } from '@/app/store/soundStore';

const AUDIO_BITS_PER_SECOND = 128_000;
// The start/stop sounds are ~220 ms; desktop audio capture would otherwise record them.
const SOUND_CLEARANCE_MS = 300;

interface ActiveRecording {
  gameId: string;
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: BlobPart[];
  timeout: number;
}

/**
 * Headless: turns the main process' F9/F10 hotkey events (`electron/capture.ts`) into an actual
 * screenshot toast sound and a `MediaRecorder` capture. Screen capture (`getUserMedia` +
 * `MediaRecorder`) only exists in a renderer, so the main process hands this the screen source id
 * and gets the finished bytes back. Mounted once, next to `AchievementToasts`.
 */
export const CaptureManager: FC = () => {
  const activeRef = useRef<ActiveRecording | null>(null);

  useEffect(() => {
    const capture = window.electronAPI?.capture;

    if (!capture) {
      return undefined;
    }

    const screenshotSoundOn = () => useSoundStore.getState().screenshotSoundEnabled;
    const recordingSoundOn = () => useSoundStore.getState().recordingSoundEnabled;

    const syncMaxSeconds = (seconds: number) => {
      void capture.setMaxRecordingSeconds(seconds).catch((err) => console.error('[CaptureManager] syncing max length failed:', err));
    };

    const syncShowTimer = (show: boolean) => {
      void capture.setShowRecordingTimer(show).catch((err) => console.error('[CaptureManager] syncing timer visibility failed:', err));
    };

    syncMaxSeconds(useCaptureStore.getState().recordingMaxSeconds);
    syncShowTimer(useCaptureStore.getState().showRecordingTimer);

    const stopSyncing = useCaptureStore.subscribe((state, previous) => {
      if (state.recordingMaxSeconds !== previous.recordingMaxSeconds) {
        syncMaxSeconds(state.recordingMaxSeconds);
      }

      if (state.showRecordingTimer !== previous.showRecordingTimer) {
        syncShowTimer(state.showRecordingTimer);
      }
    });

    const stopSignal = capture.onScreenshotTaken(() => {
      if (screenshotSoundOn()) {
        playScreenshotSound();
      }
    });

    const finishRecording = () => {
      const active = activeRef.current;

      if (!active) {
        return;
      }

      activeRef.current = null;
      window.clearTimeout(active.timeout);

      if (active.recorder.state !== 'inactive') {
        active.recorder.stop();
      }

      active.stream.getTracks().forEach((track) => track.stop());
    };

    const stopStart = capture.onStartRecording(({ gameId, sourceId, maxSeconds }) => {
      if (activeRef.current) {
        finishRecording();
      }

      if (recordingSoundOn()) {
        playRecordingStartSound();
      }

      const startCapture = async () => {
        try {
          const { recordingResolution, recordingFrameRate } = useCaptureStore.getState();
          const { width, height } = parseRecordingResolution(recordingResolution);
          const constraints = {
            audio: { mandatory: { chromeMediaSource: 'desktop' } },
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                maxWidth: width,
                maxHeight: height,
                maxFrameRate: recordingFrameRate,
              },
            },
          } as unknown as MediaStreamConstraints;

          const stream = await navigator.mediaDevices.getUserMedia(constraints);

          const recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm',
            videoBitsPerSecond: getRecordingBitsPerSecond(recordingResolution, recordingFrameRate),
            audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
          });
          const chunks: BlobPart[] = [];

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          recorder.onstop = () => {
            void new Blob(chunks, { type: 'video/webm' })
              .arrayBuffer()
              .then((bytes) => capture.saveRecording(gameId, bytes))
              .catch((err) => console.error('[CaptureManager] saving recording failed:', err));
          };

          const timeout = window.setTimeout(finishRecording, maxSeconds * 1000);

          activeRef.current = { gameId, recorder, stream, chunks, timeout };
          recorder.start();
        } catch (err) {
          console.error('[CaptureManager] could not start recording:', err);
        }
      };

      window.setTimeout(() => void startCapture(), recordingSoundOn() ? SOUND_CLEARANCE_MS : 0);
    });

    const stopStop = capture.onStopRecording(() => {
      finishRecording();

      if (recordingSoundOn()) {
        playRecordingStopSound();
      }
    });

    return () => {
      stopSignal();
      stopSyncing();
      stopStart();
      stopStop();
      finishRecording();
    };
  }, []);

  return null;
};
