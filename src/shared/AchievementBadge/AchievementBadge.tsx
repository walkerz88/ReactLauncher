import { useId, type CSSProperties, type FC } from 'react';
import type { LucideIcon } from 'lucide-react';

import type { AchievementTier } from '@/electron';

import './AchievementBadge.css';

export interface AchievementBadgeProps {
  icon: LucideIcon;
  tier: AchievementTier;
  /** Small figure on the lower edge (e.g. the target number). */
  label?: string;
  /** Greyed out: not earned yet. */
  locked?: boolean;
  /** Edge length in px. */
  size?: number;
}

const TIER_COLORS: Record<AchievementTier, { light: string; dark: string }> = {
  bronze: { light: '#e6ad74', dark: '#8a552a' },
  silver: { light: '#f0f3f8', dark: '#828d9e' },
  gold: { light: '#ffe58a', dark: '#bd8410' },
};

const OUTER_HEXAGON = '50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5';
const INNER_HEXAGON = '50,13 82,31.5 82,68.5 50,87 18,68.5 18,31.5';

/**
 * The picture of an achievement: a hexagonal emblem with a tier-coloured ring (bronze, silver, gold),
 * the icon of its group in the middle and an optional figure below. One drawing for all of them, so any
 * number of achievements looks like one set.
 */
export const AchievementBadge: FC<AchievementBadgeProps> = ({ icon: Icon, tier, label, locked, size = 64 }) => {
  const id = useId();
  const { light, dark } = TIER_COLORS[tier];
  const className = ['achievement-badge', locked ? 'achievement-badge--locked' : ''].filter(Boolean).join(' ');

  return (
    <span
      className={className}
      style={{ '--badge-size': `${size}px`, '--badge-accent': light } as CSSProperties}
      aria-hidden
      data-id="AchievementBadge"
    >
      <svg className="achievement-badge__frame" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
          <radialGradient id={`${id}-core`} cx="50%" cy="35%" r="75%">
            <stop offset="0" stopColor="#2a3446" />
            <stop offset="1" stopColor="#10151d" />
          </radialGradient>
        </defs>
        <polygon points={OUTER_HEXAGON} fill={`url(#${id}-ring)`} />
        <polygon points={INNER_HEXAGON} fill={`url(#${id}-core)`} />
      </svg>

      <Icon className="achievement-badge__icon" size={size * 0.4} strokeWidth={1.8} />

      {label ? <span className="achievement-badge__label">{label}</span> : null}
    </span>
  );
};
