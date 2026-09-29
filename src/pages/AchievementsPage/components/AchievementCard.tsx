import { useEffect, useRef, type FC } from 'react';
import { HelpCircle } from 'lucide-react';

import {
  achievementDescription,
  achievementIcon,
  achievementLabel,
  achievementTitle,
  secretHint,
} from '@/app/lib/achievements';
import { useTranslation } from '@/app/i18n';
import { formatDate } from '@/app/lib/format';
import { useLocaleStore } from '@/app/store/localeStore';
import type { AchievementDef } from '@/electron';
import { AchievementBadge } from '@/shared/AchievementBadge';

export interface AchievementCardProps {
  achievement: AchievementDef;
  /** Current value of the achievement's metric (family steps only). */
  value?: number;
  /** When it was unlocked, ms since epoch; `undefined` while locked. */
  unlockedAt?: number;
  /** Scrolls into view and gets a brief highlight — used when arriving from an achievement toast. */
  highlighted?: boolean;
}

export const AchievementCard: FC<AchievementCardProps> = ({ achievement, value = 0, unlockedAt, highlighted = false }) => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const elementRef = useRef<HTMLLIElement>(null);

  const isUnlocked = unlockedAt !== undefined;
  const isSecret = achievement.hidden === true && !isUnlocked;
  const hasProgress = achievement.metric !== 'special';
  const percent = Math.min(100, (value / achievement.target) * 100);
  const className = [
    'achievement-card',
    isUnlocked ? 'achievement-card--unlocked' : '',
    highlighted ? 'achievement-card--highlighted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (highlighted) {
      elementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  return (
    <li ref={elementRef} id={`achievement-${achievement.id}`} className={className} data-id="AchievementCard">
      <AchievementBadge
        icon={isSecret ? HelpCircle : achievementIcon(achievement)}
        tier={achievement.tier}
        label={achievementLabel(achievement)}
        locked={!isUnlocked}
        size={64}
      />

      <div className="achievement-card__body">
        <h3 className="achievement-card__title">
          {isSecret ? t('achievements.secret') : achievementTitle(achievement, locale)}
        </h3>
        <p className="achievement-card__description">
          {isSecret ? secretHint(achievement, locale) : achievementDescription(achievement, locale)}
        </p>

        {isSecret ? null : isUnlocked ? (
          <span className="achievement-card__status">
            {t('achievements.unlockedOn').replace('{date}', formatDate(unlockedAt))}
          </span>
        ) : hasProgress ? (
          <div className="achievement-card__progress">
            <div className="achievement-card__bar">
              <div className="achievement-card__bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="achievement-card__count">
              {Math.min(value, achievement.target)} / {achievement.target}
            </span>
          </div>
        ) : null}
      </div>

      <span className="achievement-card__xp">+{achievement.xp} XP</span>
    </li>
  );
};
