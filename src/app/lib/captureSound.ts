/** Same tiny module-level-`Audio` pattern as `achievementSound.ts`, one instance per sound. */
const makePlayer = (file: string): (() => void) => {
  let audio: HTMLAudioElement | null = null;

  return () => {
    audio ??= new Audio(`${process.env.PUBLIC_URL}/assets/sounds/${file}`);
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  };
};

export const playScreenshotSound = makePlayer('screenshot.wav');
export const playRecordingStartSound = makePlayer('recording-start.wav');
export const playRecordingStopSound = makePlayer('recording-stop.wav');
