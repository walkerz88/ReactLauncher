import type { CSSProperties, FC } from 'react';

import type { ThemeEffect } from '@/app/lib/themes';
import { resolveTheme, useThemeStore } from '@/app/store/themeStore';

import './ThemeEffects.css';

const MAX_PARTICLES = 36;
const MAX_SPARKLES = 24;
const RAIN_COUNT = 40;

/** How many falling (or, for embers and ocean, rising) particles each theme uses. */
const PARTICLE_COUNT: Partial<Record<ThemeEffect, number>> = {
  'anime-night': 16,
  winter: MAX_PARTICLES,
  autumn: 16,
  embers: 30,
  ocean: 20,
  sakura: 18,
  frost: MAX_PARTICLES,
  sunrise: 14,
  kish: 18,
};

const BATS: CSSProperties[] = [
  { '--y': '12%', '--duration': '19s', '--delay': '-4s', '--scale': '1' } as CSSProperties,
  { '--y': '30%', '--duration': '26s', '--delay': '-15s', '--scale': '0.7' } as CSSProperties,
  { '--y': '50%', '--duration': '22s', '--delay': '-9s', '--scale': '0.85' } as CSSProperties,
];

/** How many twinkling dots (stars, sparkles, fireflies) each theme uses. */
const SPARKLE_COUNT: Partial<Record<ThemeEffect, number>> = {
  'anime-night': 10,
  aurora: 10,
  nebula: MAX_SPARKLES,
  fireflies: 16,
  lavender: 14,
};

/** Stable pseudo-random 0..1 per index, so the layout doesn't jump on re-render. */
const spread = (index: number, salt: number): number => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
};

const PARTICLES: CSSProperties[] = Array.from({ length: MAX_PARTICLES }, (_, index) => ({
  '--x': `${Math.round(spread(index, 1) * 100)}%`,
  '--size': `${10 + Math.round(spread(index, 2) * 10)}px`,
  '--duration': `${9 + Math.round(spread(index, 3) * 8)}s`,
  '--delay': `${-Math.round(spread(index, 4) * 17)}s`,
  '--sway': `${40 + Math.round(spread(index, 5) * 90)}px`,
} as CSSProperties));

const SPARKLES: CSSProperties[] = Array.from({ length: MAX_SPARKLES }, (_, index) => ({
  '--x': `${Math.round(spread(index, 6) * 96)}%`,
  '--y': `${Math.round(spread(index, 7) * 90)}%`,
  '--size': `${8 + Math.round(spread(index, 8) * 12)}px`,
  '--delay': `${-(spread(index, 9) * 4).toFixed(1)}s`,
} as CSSProperties));

const RAIN: CSSProperties[] = Array.from({ length: RAIN_COUNT }, (_, index) => ({
  '--x': `${Math.round(spread(index, 10) * 100)}%`,
  '--height': `${80 + Math.round(spread(index, 11) * 140)}px`,
  '--duration': `${(5.5 + spread(index, 12) * 6).toFixed(1)}s`,
  '--delay': `${-(spread(index, 13) * 6).toFixed(1)}s`,
} as CSSProperties));

/** Decorative animation layers of the active unique theme: fixed to the window (not to the page scroll) and always behind the UI. */
export const ThemeEffects: FC = () => {
  const effect = useThemeStore((state) => resolveTheme(state.theme, state.customThemes).effect);

  if (!effect) {
    return null;
  }

  if (effect === 'cyberpunk') {
    return (
      <div className="theme-fx" aria-hidden="true" data-id="ThemeEffects">
        <div className="theme-fx__floor">
          <div className="theme-fx__grid" />
        </div>
        <div className="theme-fx__beam" />
        <div className="theme-fx__scanlines" />
      </div>
    );
  }

  return (
    <div className="theme-fx" aria-hidden="true" data-id="ThemeEffects">
      {effect === 'anime-night' ? (
        <>
          <span className="theme-fx__shooting-star" />
          <span className="theme-fx__shooting-star theme-fx__shooting-star--late" />
        </>
      ) : null}
      {effect === 'aurora' ? (
        <>
          <div className="theme-fx__aurora" />
          <div className="theme-fx__aurora theme-fx__aurora--alt" />
        </>
      ) : null}
      {effect === 'nebula' || effect === 'lavender' ? (
        <>
          <div className="theme-fx__nebula" />
          <div className="theme-fx__nebula theme-fx__nebula--alt" />
        </>
      ) : null}
      {effect === 'ocean' || effect === 'sunrise' ? (
        <>
          <div className="theme-fx__glow" />
          <div className="theme-fx__glow theme-fx__glow--alt" />
        </>
      ) : null}
      {effect === 'embers' || effect === 'kish' ? <div className="theme-fx__heat" /> : null}
      {effect === 'kish'
        ? BATS.map((style, index) => <span key={`bat-${index}`} className="theme-fx__bat" style={style} />)
        : null}
      {SPARKLES.slice(0, SPARKLE_COUNT[effect] ?? 0).map((style, index) => (
        <span
          key={`sparkle-${index}`}
          className={effect === 'fireflies' ? 'theme-fx__firefly' : 'theme-fx__sparkle'}
          style={style}
        />
      ))}
      {effect === 'matrix'
        ? RAIN.map((style, index) => <span key={`rain-${index}`} className="theme-fx__rain" style={style} />)
        : null}
      {PARTICLES.slice(0, PARTICLE_COUNT[effect] ?? 0).map((style, index) => (
        <span key={`particle-${index}`} className="theme-fx__petal" style={style} />
      ))}
    </div>
  );
};
