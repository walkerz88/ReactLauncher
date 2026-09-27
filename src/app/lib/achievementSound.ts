/** Several achievements (and a level-up) can unlock from the same action and arrive as separate
 * notifications a few milliseconds apart; this window makes them play the chime only once. */
const COALESCE_WINDOW_MS = 400;

let audio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;

/** Plays the achievement-unlock chime, at most once per `COALESCE_WINDOW_MS`. Caller checks the setting. */
export const playAchievementSound = (): void => {
  const now = Date.now();

  if (now - lastPlayedAt < COALESCE_WINDOW_MS) {
    return;
  }

  lastPlayedAt = now;
  audio ??= new Audio(`${process.env.PUBLIC_URL}/assets/sounds/achievement-unlock.wav`);
  audio.currentTime = 0;
  void audio.play().catch(() => {});
};
