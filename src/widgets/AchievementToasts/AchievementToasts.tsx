import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { achievementDescription, achievementIcon, achievementLabel, achievementTitle } from '@/app/lib/achievements';
import { useLocaleStore } from '@/app/store/localeStore';
import { useProgressStore, type Toast } from '@/app/store/progressStore';
import { AchievementBadge } from '@/shared/AchievementBadge';

import './AchievementToasts.css';

const TOAST_LIFETIME_MS = 12000;

interface ToastCardProps {
  toast: Toast;
}

const ToastCard: FC<ToastCardProps> = ({ toast }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const locale = useLocaleStore((state) => state.locale);
  const achievements = useProgressStore((state) => state.view?.achievements);
  const dismissToast = useProgressStore((state) => state.dismissToast);

  const { notification } = toast;

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(toast.key), TOAST_LIFETIME_MS);

    return () => window.clearTimeout(timer);
  }, [dismissToast, toast.key]);

  const achievement =
    notification.type === 'achievement' ? achievements?.find((entry) => entry.id === notification.id) : null;

  if (notification.type === 'achievement' && !achievement) {
    return null;
  }

  const handleClick = () => {
    dismissToast(toast.key);

    if (achievement) {
      navigate(`/achievements?highlight=${achievement.id}`);
    }
  };

  return (
    <button type="button" className="achievement-toast" onClick={handleClick} data-id="AchievementToast">
      {achievement ? (
        <AchievementBadge
          icon={achievementIcon(achievement)}
          tier={achievement.tier}
          label={achievementLabel(achievement)}
          size={56}
        />
      ) : (
        <span className="achievement-toast__level" aria-hidden>
          <TrendingUp size={26} />
        </span>
      )}

      <span className="achievement-toast__text">
        <span className="achievement-toast__caption">{achievement ? t('toast.achievement') : t('toast.level')}</span>
        <span className="achievement-toast__title">
          {achievement
            ? achievementTitle(achievement, locale)
            : t('achievements.level').replace('{level}', String(notification.type === 'level' ? notification.level : ''))}
        </span>
        {achievement ? (
          <span className="achievement-toast__description">{achievementDescription(achievement, locale)}</span>
        ) : null}
        {achievement ? <span className="achievement-toast__xp">+{achievement.xp} XP</span> : null}
      </span>
    </button>
  );
};

/** New achievements and level-ups, stacked in the corner for a few seconds. */
export const AchievementToasts: FC = () => {
  const toasts = useProgressStore((state) => state.toasts);

  return (
    <div className="achievement-toasts" aria-live="polite" data-id="AchievementToasts">
      {toasts.map((toast) => (
        <ToastCard key={toast.key} toast={toast} />
      ))}
    </div>
  );
};
