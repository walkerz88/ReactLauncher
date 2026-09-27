import { useEffect, useState, type FC } from 'react';

import { consumeSplashSkip } from '@/app/lib/profile';
import { useWelcomeAnimationStore } from '@/app/store/welcomeAnimationStore';
import { WelcomeScene, getWelcomeSceneDuration } from '@/shared/WelcomeScene';

import './SplashScreen.css';

/** Must match the `.splash-screen` fade-out transition duration in `SplashScreen.css`. */
const FADE_OUT_MS = 500;

type Phase = 'visible' | 'leaving' | 'hidden';

/** Asked once per page load (not per render), because asking uses the request up. */
const shouldSkipSplash = consumeSplashSkip();

/**
 * Full-screen startup animation shown once per app launch, on top of everything
 * else. Uses only theme CSS custom properties, so it automatically matches
 * whichever theme was already applied to `<html data-theme>` before mount
 * (see `themeStore`). Toggled from Settings via `useWelcomeAnimationStore`.
 */
export const SplashScreen: FC = () => {
  const [variant] = useState(() => useWelcomeAnimationStore.getState().variant);
  const [phase, setPhase] = useState<Phase>(() =>
    useWelcomeAnimationStore.getState().enabled && !shouldSkipSplash ? 'visible' : 'hidden',
  );

  useEffect(() => {
    const visibleMs = getWelcomeSceneDuration(variant);
    const leaveTimer = window.setTimeout(() => setPhase('leaving'), visibleMs);
    const hideTimer = window.setTimeout(() => setPhase('hidden'), visibleMs + FADE_OUT_MS);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [variant]);

  if (phase === 'hidden') {
    return null;
  }

  return (
    <div
      className={['splash-screen', phase === 'leaving' ? 'splash-screen--leaving' : ''].filter(Boolean).join(' ')}
      role="presentation"
      aria-hidden="true"
      data-id="SplashScreen"
    >
      <WelcomeScene variant={variant} />
    </div>
  );
};
