import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { levelTitle } from '@/app/lib/achievements';
import { useLocaleStore } from '@/app/store/localeStore';
import type { ProgressView } from '@/electron';
import { Tooltip } from '@/shared/Tooltip';

export interface LevelCardProps {
  view: ProgressView;
  profileName?: string;
}

export const LevelCard: FC<LevelCardProps> = ({ view, profileName }) => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);

  const span = Math.max(1, view.nextLevelXp - view.levelStartXp);
  const percent = Math.min(100, Math.max(0, ((view.xp - view.levelStartXp) / span) * 100));
  const unlockedCount = Object.keys(view.unlocked).length;

  const stats = [
    { label: t('achievements.stat.hours'), value: view.values.playHours },
    { label: t('achievements.stat.launches'), value: view.values.launches },
    { label: t('achievements.stat.games'), value: view.values.gamesPlayed },
    { label: t('achievements.stat.days'), value: view.values.daysPlayed },
    { label: t('achievements.stat.achievements'), value: `${unlockedCount} / ${view.achievements.length}` },
  ];

  return (
    <section className="level-card" data-id="LevelCard">
      <div className="level-card__badge">
        <div className="level-card__level" aria-hidden>
          <span className="level-card__level-number">{view.level}</span>
        </div>
        {profileName ? <span className="level-card__profile-name">{profileName}</span> : null}
        <Tooltip label={t('profile.manage')}>
          <Link to="/settings?tab=profiles" className="level-card__manage" aria-label={t('profile.manage')}>
            <Settings size={16} />
          </Link>
        </Tooltip>
      </div>

      <div className="level-card__main">
        <div className="level-card__heading">
          <h2 className="level-card__title">{levelTitle(view.level, locale)}</h2>
          <span className="level-card__caption">{t('achievements.level').replace('{level}', String(view.level))}</span>
        </div>

        <div
          className="level-card__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div className="level-card__bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="level-card__xp">
          {t('achievements.xp')
            .replace('{current}', String(view.xp))
            .replace('{next}', String(view.nextLevelXp))}
        </span>

        <dl className="level-card__stats">
          {stats.map(({ label, value }) => (
            <div key={label} className="level-card__stat">
              <dd>{value}</dd>
              <dt>{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
