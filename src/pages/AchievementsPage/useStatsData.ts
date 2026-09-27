import { useMemo } from 'react';

import { useTranslation } from '@/app/i18n';
import { useContentStore } from '@/app/store/contentStore';
import { useFavoritesStore } from '@/app/store/favoritesStore';
import { useLocaleStore } from '@/app/store/localeStore';
import { usePlaytimeStore } from '@/app/store/playtimeStore';
import { useProgressStore } from '@/app/store/progressStore';

export interface StatRow {
  key: string;
  label: string;
  seconds: number;
}

export interface CalendarDay {
  day: string;
  seconds: number;
}

export interface MonthGenre {
  month: string;
  /** `null` when nothing was played that month. */
  genre: string | null;
  label: string;
}

export interface StatsData {
  gamesPlayedCount: number;
  favoritesCount: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  topGames: StatRow[];
  topGenres: StatRow[];
  topSeries: StatRow[];
  whenYouPlay: Array<{ key: string; label: string; value: number; caption?: string }>;
  avgSessionMinutes: number;
  /** % of the library (by game count) that has ever been launched. */
  libraryPlayedPercent: number;
  /** Launches per (weekday × 24 + hour) bucket, Sunday first — the "active hours" heatmap. */
  hourWeekdayLaunches: number[];
  /** One entry per day with any play time, oldest first — the activity calendar. */
  calendarDays: CalendarDay[];
  /** This month's play time vs the previous month's, as a % change (`null` if there is no previous month to compare). */
  monthTrendPercent: number | null;
  currentMonthSeconds: number;
  /** Top genre of each of the last few months, oldest first. */
  genreByMonth: MonthGenre[];
  /** The most-played game of the current calendar week/month/year, `null` if nothing was played in it. */
  favoriteGameWeek: StatRow | null;
  favoriteGameMonth: StatRow | null;
  favoriteGameYear: StatRow | null;
}

const TOP_GAMES_LIMIT = 8;
const TOP_GENRES_LIMIT = 6;
const TOP_SERIES_LIMIT = 6;

const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthOfDay = (day: string): string => day.slice(0, 7);
const toLocalDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The game with the most seconds in `perGame`, `null` if it's empty. */
const topGameOf = (perGame: Map<string, number>, nameByGameId: Map<string, string>): StatRow | null => {
  let best: StatRow | null = null;

  for (const [gameId, seconds] of perGame) {
    if (!best || seconds > best.seconds) {
      best = { key: gameId, label: nameByGameId.get(gameId) ?? gameId, seconds };
    }
  }

  return best;
};

/** Aggregates the data behind the profile's Stats tab from the stores that already track it — no new IPC needed. */
export const useStatsData = (): StatsData => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const view = useProgressStore((state) => state.view);
  const apps = useContentStore((state) => state.apps);
  const playtimeById = usePlaytimeStore((state) => state.byId);
  const favoritesCount = useFavoritesStore((state) => state.ids.length);

  return useMemo(() => {
    const byGenre = new Map<string, number>();
    const bySeries = new Map<string, number>();
    const genreByGameId = new Map<string, string>();
    const nameByGameId = new Map<string, string>();
    const games: StatRow[] = [];

    for (const app of apps) {
      nameByGameId.set(app.id, app.name);

      if (app.genre) {
        genreByGameId.set(app.id, app.genre);
      }

      const seconds = playtimeById[app.id]?.seconds ?? 0;

      if (seconds <= 0) {
        continue;
      }

      games.push({ key: app.id, label: app.name, seconds });

      if (app.genre) {
        byGenre.set(app.genre, (byGenre.get(app.genre) ?? 0) + seconds);
      }

      if (app.series) {
        bySeries.set(app.series, (bySeries.get(app.series) ?? 0) + seconds);
      }
    }

    const byDesc = (a: StatRow, b: StatRow) => b.seconds - a.seconds;

    const topGames = games.sort(byDesc).slice(0, TOP_GAMES_LIMIT);
    const topGenres = Array.from(byGenre, ([key, seconds]) => ({ key, label: t(key), seconds }))
      .sort(byDesc)
      .slice(0, TOP_GENRES_LIMIT);
    const topSeries = Array.from(bySeries, ([key, seconds]) => ({ key, label: key, seconds }))
      .sort(byDesc)
      .slice(0, TOP_SERIES_LIMIT);

    const launches = view?.values.launches ?? 0;

    const now = new Date();
    const weekStart = new Date(now);

    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekStartDay = toLocalDay(weekStart);
    const monthStartDay = `${monthKey(now)}-01`;
    const yearStartDay = `${now.getFullYear()}-01-01`;

    // Daily totals (summed across games), monthly genre totals and the week/month/year favourite game
    // all come from the same day → game → seconds log, so they agree by construction.
    const dailyEntries = Object.entries(view?.dailyPlaySeconds ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const calendarDays: CalendarDay[] = [];
    const secondsByMonth = new Map<string, number>();
    const genreSecondsByMonth = new Map<string, Map<string, number>>();
    const weekGameSeconds = new Map<string, number>();
    const monthGameSeconds = new Map<string, number>();
    const yearGameSeconds = new Map<string, number>();

    for (const [day, perGame] of dailyEntries) {
      let dayTotal = 0;
      const month = monthOfDay(day);

      for (const [gameId, seconds] of Object.entries(perGame)) {
        dayTotal += seconds;

        const genre = genreByGameId.get(gameId);

        if (genre) {
          const perGenre = genreSecondsByMonth.get(month) ?? new Map<string, number>();

          perGenre.set(genre, (perGenre.get(genre) ?? 0) + seconds);
          genreSecondsByMonth.set(month, perGenre);
        }

        if (day >= weekStartDay) {
          weekGameSeconds.set(gameId, (weekGameSeconds.get(gameId) ?? 0) + seconds);
        }

        if (day >= monthStartDay) {
          monthGameSeconds.set(gameId, (monthGameSeconds.get(gameId) ?? 0) + seconds);
        }

        if (day >= yearStartDay) {
          yearGameSeconds.set(gameId, (yearGameSeconds.get(gameId) ?? 0) + seconds);
        }
      }

      calendarDays.push({ day, seconds: dayTotal });
      secondsByMonth.set(month, (secondsByMonth.get(month) ?? 0) + dayTotal);
    }

    const currentMonthKey = monthKey(now);
    const previousMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const currentMonthSeconds = secondsByMonth.get(currentMonthKey) ?? 0;
    const previousMonthSeconds = secondsByMonth.get(previousMonthKey) ?? 0;
    const hasHistory = dailyEntries.some(([day]) => monthOfDay(day) === previousMonthKey);
    const monthTrendPercent = hasHistory
      ? previousMonthSeconds > 0
        ? Math.round(((currentMonthSeconds - previousMonthSeconds) / previousMonthSeconds) * 100)
        : currentMonthSeconds > 0
          ? 100
          : 0
      : null;

    // The full current year, January through December, rather than a window tied to history or today's date.
    const genreByMonth: MonthGenre[] = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), index, 1);
      const key = monthKey(date);
      const perGenre = genreSecondsByMonth.get(key);
      const top = perGenre ? Array.from(perGenre.entries()).sort((a, b) => b[1] - a[1])[0] : undefined;

      return {
        month: key,
        genre: top ? top[0] : null,
        label: date.toLocaleDateString(locale, { month: 'short' }),
      };
    });

    return {
      gamesPlayedCount: games.length,
      favoritesCount,
      achievementsUnlocked: view ? Object.keys(view.unlocked).length : 0,
      achievementsTotal: view?.achievements.length ?? 0,
      topGames,
      topGenres,
      topSeries,
      whenYouPlay: view
        ? [
            { key: 'night', label: t('stats.when.night'), value: view.values.nightLaunches, caption: '00:00–05:00' },
            { key: 'morning', label: t('stats.when.morning'), value: view.values.morningLaunches, caption: '05:00–09:00' },
            { key: 'day', label: t('stats.when.day'), value: view.values.dayLaunches, caption: '09:00–18:00' },
            { key: 'evening', label: t('stats.when.evening'), value: view.values.eveningLaunches, caption: '18:00–00:00' },
            { key: 'weekend', label: t('stats.when.weekend'), value: view.values.weekendLaunches },
            { key: 'weekday', label: t('stats.when.weekday'), value: view.values.weekdayLaunches },
          ].filter((row) => row.value > 0 || launches > 0)
        : [],
      avgSessionMinutes: view?.values.avgSessionMinutes ?? 0,
      libraryPlayedPercent: apps.length > 0 ? Math.round((games.length / apps.length) * 100) : 0,
      hourWeekdayLaunches: view?.hourWeekdayLaunches ?? [],
      calendarDays,
      monthTrendPercent,
      currentMonthSeconds,
      genreByMonth,
      favoriteGameWeek: topGameOf(weekGameSeconds, nameByGameId),
      favoriteGameMonth: topGameOf(monthGameSeconds, nameByGameId),
      favoriteGameYear: topGameOf(yearGameSeconds, nameByGameId),
    };
  }, [apps, playtimeById, favoritesCount, view, t, locale]);
};
