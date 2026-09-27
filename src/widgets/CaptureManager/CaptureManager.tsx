import { useEffect, useRef, type FC } from 'react';

import { playRecordingStartSound, playRecordingStopSound, playScreenshotSound } from '@/app/lib/captureSound';
import { useSoundStore } from '@/app/store/soundStore';

// Kept modest on purpose: hardware acceleration is off (`app.disableHardwareAcceleration()` in
// electron.ts), so playback in the in-app gallery decodes VP9 entirely in software — 1080p/30fps
// stuttered badly there even though it played fine in Explorer's hardware-accelerated preview.
const VIDEO_BITS_PER_SECOND = 2_500_000;
const RECORDING_CONSTRAINTS = { maxWidth: 1280, maxHeight: 720, maxFrameRate: 30 };

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

    const soundOn = () => useSoundStore.getState().achievementSoundEnabled;

    const stopSignal = capture.onScreenshotTaken(() => {
      if (soundOn()) {
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

      if (soundOn()) {
        playRecordingStartSound();
      }

      const startCapture = async () => {
        try {
          const constraints = {
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                ...RECORDING_CONSTRAINTS,
              },
            },
          } as unknown as MediaStreamConstraints;

          const stream = await navigator.mediaDevices.getUserMedia(constraints);

          const recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
            videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
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

      void startCapture();
    });

    const stopStop = capture.onStopRecording(() => {
      if (soundOn()) {
        playRecordingStopSound();
      }

      finishRecording();
    });

    return () => {
      stopSignal();
      stopStart();
      stopStop();
      finishRecording();
    };
  }, []);

  return null;
};
