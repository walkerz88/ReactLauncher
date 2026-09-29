import { useEffect, useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flame, Gauge, Heart, LibraryBig, Timer, TrendingDown, TrendingUp } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { GROUP_ORDER, GROUP_TITLES, METRIC_ORDER, METRIC_TITLES } from '@/app/lib/achievements';
import { formatDuration } from '@/app/lib/format';
import { useLocaleStore } from '@/app/store/localeStore';
import { useProfileStore } from '@/app/store/profileStore';
import { useProgressStore } from '@/app/store/progressStore';
import { Tabs, type TabItem } from '@/shared/Tabs';
import { HorizontalBarChart } from '@/shared/HorizontalBarChart';
import type { AchievementDef } from '@/electron';

import { AchievementCard } from './components/AchievementCard';
import { ActiveHoursHeatmap } from './components/ActiveHoursHeatmap';
import { ActivityCalendar } from './components/ActivityCalendar';
import { FavoriteGames } from './components/FavoriteGames';
import { GenreMonthTrend } from './components/GenreMonthTrend';
import { LevelCard } from './components/LevelCard';
import { StatTile } from './components/StatTile';
import { useStatsData } from './useStatsData';

import './AchievementsPage.css';

const ICON_SIZE = 20;

type ProfileTab = 'achievements' | 'stats';

/**
 * A secret family (e.g. cheat codes) lists the steps already unlocked and only the next hidden one, instead of a
 * row of identical "Secret achievement" cards.
 */
const collapseSecretFamilies = (achievements: AchievementDef[], unlocked: Record<string, number>): AchievementDef[] => {
  const shownLocked = new Set<string>();

  return achievements.filter((achievement) => {
    if (!achievement.hidden || achievement.metric === 'special' || unlocked[achievement.id]) {
      return true;
    }

    if (shownLocked.has(achievement.metric)) {
      return false;
    }

    shownLocked.add(achievement.metric);

    return true;
  });
};

export const AchievementsPage: FC = () => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const view = useProgressStore((state) => state.view);
  const statsData = useStatsData();
  const profiles = useProfileStore((state) => state.profiles);
  const activeProfileId = useProfileStore((state) => state.activeId);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  const [tab, setTab] = useState<ProfileTab>('achievements');
  const [searchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Synced via an effect, not a lazy initial state, so clicking a second achievement toast while
  // already on this page re-triggers the highlight even though the route component doesn't remount.
  useEffect(() => {
    const next = searchParams.get('highlight');

    if (next) {
      setHighlightId(next);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!highlightId) {
      return undefined;
    }

    const timer = window.setTimeout(() => setHighlightId(null), 2400);

    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const header = <h1 className="home-section__title">{t('profile.title')}</h1>;

  if (!view) {
    return (
      <div className="page page--scroll-pad" data-id="AchievementsPage">
        {header}
      </div>
    );
  }

  const formatTime = (seconds: number): string => formatDuration(seconds, t);
  const formatLaunches = (value: number): string => `${value} ${t('stats.unit.launches')}`;

  const tabs: TabItem<ProfileTab>[] = [
    { id: 'achievements', label: t('nav.achievements') },
    { id: 'stats', label: t('stats.title') },
  ];

  const topGamesRows = statsData.topGames.map((row) => ({ key: row.key, label: row.label, value: row.seconds }));
  const genreSeconds = statsData.topGenres.map((row) => ({ key: row.key, label: row.label, value: row.seconds }));
  const topSeriesRows = statsData.topSeries.map((row) => ({ key: row.key, label: row.label, value: row.seconds }));

  const weekdayLabels = [
    t('stats.weekday.sun'),
    t('stats.weekday.mon'),
    t('stats.weekday.tue'),
    t('stats.weekday.wed'),
    t('stats.weekday.thu'),
    t('stats.weekday.fri'),
    t('stats.weekday.sat'),
  ];

  return (
    <div className="page achievements page--scroll-pad" data-id="AchievementsPage">
      {header}

      <Tabs tabs={tabs} activeTab={tab} ariaLabel={t('profile.title')} onChange={setTab} />

      <LevelCard view={view} profileName={activeProfile?.name} />

      {tab === 'stats' ? (
        <>
          <div className="stats__tiles">
            <StatTile icon={<Timer size={ICON_SIZE} />} value={String(view.values.longestSessionHours)} label={t('stats.kpi.longestSession')} />
            <StatTile icon={<Gauge size={ICON_SIZE} />} value={formatDuration(statsData.avgSessionMinutes * 60, t)} label={t('stats.kpi.avgSession')} />
            <StatTile icon={<Flame size={ICON_SIZE} />} value={String(view.values.bestStreak)} label={t('stats.kpi.bestStreak')} />
            <StatTile icon={<Heart size={ICON_SIZE} />} value={String(statsData.favoritesCount)} label={t('stats.kpi.favorites')} />
            <StatTile icon={<LibraryBig size={ICON_SIZE} />} value={`${statsData.libraryPlayedPercent}%`} label={t('stats.kpi.libraryCoverage')} />
            {statsData.monthTrendPercent !== null ? (
              <StatTile
                icon={
                  statsData.monthTrendPercent >= 0 ? <TrendingUp size={ICON_SIZE} /> : <TrendingDown size={ICON_SIZE} />
                }
                value={`${statsData.monthTrendPercent >= 0 ? '+' : ''}${statsData.monthTrendPercent}%`}
                label={t('stats.kpi.monthTrend')}
              />
            ) : null}
          </div>

          <div className="stats__charts">
            <div className="stats__row">
              {topGamesRows.length > 0 ? (
                <section className="stats-card">
                  <h3 className="settings-section__title">{t('stats.section.topGames')}</h3>
                  <HorizontalBarChart rows={topGamesRows} emptyLabel={t('stats.empty.games')} formatValue={formatTime} />
                </section>
              ) : null}

              {topSeriesRows.length > 0 ? (
                <section className="stats-card">
                  <h3 className="settings-section__title">{t('stats.section.series')}</h3>
                  <HorizontalBarChart rows={topSeriesRows} emptyLabel={t('stats.empty.series')} formatValue={formatTime} />
                </section>
              ) : null}
            </div>

            <div className="stats__row">
              {genreSeconds.length > 0 ? (
                <section className="stats-card">
                  <h3 className="settings-section__title">{t('stats.section.genres')}</h3>
                  <HorizontalBarChart rows={genreSeconds} emptyLabel={t('stats.empty.genres')} formatValue={formatTime} />
                </section>
              ) : null}

              {statsData.favoriteGameWeek || statsData.favoriteGameMonth || statsData.favoriteGameYear ? (
                <section className="stats-card">
                  <h3 className="settings-section__title">{t('stats.section.favoriteGame')}</h3>
                  <FavoriteGames
                    week={statsData.favoriteGameWeek}
                    month={statsData.favoriteGameMonth}
                    year={statsData.favoriteGameYear}
                    periodLabels={{ week: t('stats.period.week'), month: t('stats.period.month'), year: t('stats.period.year') }}
                    emptyGameLabel={t('stats.genre.none')}
                    formatValue={formatTime}
                  />
                </section>
              ) : null}
            </div>

            {statsData.genreByMonth.some((month) => month.genre) ? (
              <section className="stats-card">
                <h3 className="settings-section__title">{t('stats.section.genreTrend')}</h3>
                <GenreMonthTrend months={statsData.genreByMonth} emptyGenreLabel={t('stats.genre.none')} translateGenre={t} />
              </section>
            ) : null}

            <div className="stats__row">
              {statsData.whenYouPlay.length > 0 ? (
                <section className="stats-card">
                  <h3 className="settings-section__title">{t('stats.section.whenYouPlay')}</h3>
                  <HorizontalBarChart rows={statsData.whenYouPlay} emptyLabel={t('stats.empty.when')} formatValue={formatLaunches} />
                </section>
              ) : null}

              {statsData.hourWeekdayLaunches.some((count) => count > 0) ? (
                <section className="stats-card">
                  <h3 className="settings-section__title">{t('stats.section.hours')}</h3>
                  <ActiveHoursHeatmap
                    values={statsData.hourWeekdayLaunches}
                    weekdayLabels={weekdayLabels}
                    emptyLabel={t('stats.empty.hours')}
                    formatValue={formatLaunches}
                  />
                </section>
              ) : null}
            </div>

            {statsData.calendarDays.length > 0 ? (
              <section className="stats-card">
                <h3 className="settings-section__title">{t('stats.section.calendar')}</h3>
                <ActivityCalendar days={statsData.calendarDays} emptyLabel={t('stats.empty.calendar')} formatValue={formatTime} />
              </section>
            ) : null}
          </div>
        </>
      ) : (
        <div className="achievements__wrapper">
          {METRIC_ORDER.map((metric) => (
            <section key={metric} className="achievements__group">
              <h2 className="settings-section__title">{METRIC_TITLES[metric][locale]}</h2>
              <ul className="achievements__list">
                {view.achievements
                  .filter((achievement) => achievement.metric === metric && !achievement.group)
                  .map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      value={view.values[metric]}
                      unlockedAt={view.unlocked[achievement.id]}
                      highlighted={achievement.id === highlightId}
                    />
                  ))}
              </ul>
            </section>
          ))}

          {GROUP_ORDER.map((group) => (
            <section key={group} className="achievements__group">
              <h2 className="settings-section__title">{GROUP_TITLES[group][locale]}</h2>
              <ul className="achievements__list">
                {collapseSecretFamilies(
                  view.achievements.filter((achievement) => achievement.group === group),
                  view.unlocked,
                ).map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      value={view.values[achievement.metric]}
                      unlockedAt={view.unlocked[achievement.id]}
                      highlighted={achievement.id === highlightId}
                    />
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
