import {
  ACHIEVEMENTS,
  FAVORITE_XP,
  FEATURE_SPECIALS,
  GAME_ADDED_XP,
  LAUNCH_XP,
  levelFromXp,
  levelStartXp,
  LUCKY_XP,
  metricValue,
  PRESET_THEME_IDS,
  SECONDS_PER_XP,
  SECRET_IDS,
  SECRET_SPECIALS,
  SECRET_XP,
  SPECIAL_ID_PREFIX,
  STATS_ONLY_METRICS,
  THEME_XP,
  type AchievementDef,
  type Metric,
  type ProgressStats,
} from './achievements';
import type { LauncherAction } from './launcherActions';

/**
 * Per-profile progress: statistics, XP, unlocked achievements. Owned by the main process: play time and
 * launches come from the game processes it starts and watches itself, and the data is stored in the
 * profile's sealed file under a store the renderer can't touch. The renderer only displays it.
 */

export interface ProgressData {
  xp: number;
  stats: ProgressStats;
  /** Achievement id → when it was unlocked (ms since epoch). */
  unlocked: Record<string, number>;
  /** Game id → local date of the last launch that earned launch XP, so relaunching over and over earns nothing. */
  launchDayById: Record<string, string>;
}

export interface ProgressView {
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  values: Record<Metric, number>;
  unlocked: Record<string, number>;
  achievements: AchievementDef[];
  /** Launches per (weekday × 24 + hour) bucket — the "active hours" heatmap. */
  hourWeekdayLaunches: number[];
  /** Seconds played per game id, per local day, for the last ~13 months — the activity calendar, the
   * month-over-month trend and "favourite genre this month" (the renderer already knows each game's genre). */
  dailyPlaySeconds: Record<string, Record<string, number>>;
}

export type ProgressNotification = { type: 'achievement'; id: string } | { type: 'level'; level: number };

export type ProgressEventKind =
  | 'favorite'
  | 'game'
  | 'lucky'
  | 'secret'
  | 'theme'
  | 'feature'
  | 'themeUsed'
  | 'trailer'
  | 'genre'
  | 'series'
  | 'screenshot'
  | 'recording';

export interface ProgressStorage {
  getActiveId: () => string | null;
  read: (profileId: string) => unknown;
  write: (profileId: string, data: ProgressData) => Promise<void>;
  /** When the profile was created (ms since epoch), for its birthday. */
  getProfileCreatedAt: (profileId: string) => number | null;
}

export interface ProgressCallbacks {
  changed: (view: ProgressView | null) => void;
  notify: (notification: ProgressNotification) => void;
}

const MAX_ID_LENGTH = 120;
const MAX_GAMES = 5000;
const MAX_FAVORITES = 500;
const MAX_ADDED_GAMES = 500;
const MAX_THEMES = 100;
const MAX_THEMES_TRIED = 60;
const MAX_GENRES = 40;
const MAX_SERIES = 200;
const MAX_SERIES_NAME = 60;
const MAX_DAY_GAMES = 20;
/** How many local days of `dailyPlaySeconds` are kept — a bit over a year, for the activity calendar. */
const MAX_DAILY_LOG_DAYS = 400;
const MAX_GAMES_PER_DAY_LOG = 20;
const HOUR_WEEKDAY_BUCKETS = 168;
const MAX_SESSION_SECONDS = 48 * 3600;
/** A session is worth at most this many XP (three hours), so a game left running overnight isn't a farm. */
const MAX_SESSION_XP = 180;
const ANSWER_SESSION_SECONDS = 42 * 60;
const CHAIN_WINDOW_MS = 60_000;
const THEME_ID_PATTERN = /^custom-[0-9a-z]{1,20}$/i;
const GENRE_PATTERN = /^genre\.[a-z]{2,20}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN_ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
const SPECIALS_BY_KEY = new Map(
  ACHIEVEMENTS.filter((achievement) => achievement.metric === 'special').map((achievement) => [
    achievement.id.slice(SPECIAL_ID_PREFIX.length),
    achievement,
  ]),
);

const ACTION_SPECIALS: Record<LauncherAction, string> = {
  'backup-created': 'backup',
  'backup-restored': 'restore',
  'installer-opened': 'installer',
  'settings-opened': 'tweaker',
  'bonus-opened': 'bonus',
  'game-stopped': 'emergencyExit',
  'config-saved': 'editor',
  'disk-scan-completed': 'diskScan',
};

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const idList = (value: unknown, limit: number): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length <= MAX_ID_LENGTH).slice(0, limit)
    : [];

const hourWeekdayGrid = (value: unknown): number[] => {
  const source = Array.isArray(value) ? value : [];

  return Array.from({ length: HOUR_WEEKDAY_BUCKETS }, (_, index) => count(source[index]));
};

/** `day -> gameId -> seconds`, kept to the most recent `MAX_DAILY_LOG_DAYS` (sorted, since `YYYY-MM-DD` keys sort chronologically). */
const dailyPlaySecondsOf = (value: unknown): Record<string, Record<string, number>> =>
  Object.fromEntries(
    Object.entries(record(value))
      .filter(([day]) => DAY_PATTERN.test(day))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-MAX_DAILY_LOG_DAYS)
      .map(([day, perGame]) => [
        day,
        Object.fromEntries(
          Object.entries(record(perGame))
            .filter((entry): entry is [string, unknown] => entry[0].length <= MAX_ID_LENGTH)
            .slice(0, MAX_GAMES_PER_DAY_LOG)
            .map(([id, seconds]) => [id, count(seconds)]),
        ),
      ]),
  );

/** Stored data is authenticated, but it may come from another version: anything unexpected reads as zero. */
const sanitize = (raw: unknown): ProgressData => {
  const source = record(raw);
  const stats = record(source.stats);
  const dayGames = record(stats.dayGames);
  const secondsById = Object.fromEntries(
    Object.entries(record(stats.secondsById))
      .slice(0, MAX_GAMES)
      .map(([id, seconds]) => [id, count(seconds)]),
  );

  return {
    xp: count(source.xp),
    stats: {
      launches: count(stats.launches),
      playSeconds: count(stats.playSeconds),
      sessionCount: count(stats.sessionCount),
      longestSessionSeconds: count(stats.longestSessionSeconds),
      nightLaunches: count(stats.nightLaunches),
      morningLaunches: count(stats.morningLaunches),
      dayLaunches: count(stats.dayLaunches),
      eveningLaunches: count(stats.eveningLaunches),
      weekendLaunches: count(stats.weekendLaunches),
      weekdayLaunches: count(stats.weekdayLaunches),
      hourWeekdayLaunches: hourWeekdayGrid(stats.hourWeekdayLaunches),
      dailyPlaySeconds: dailyPlaySecondsOf(stats.dailyPlaySeconds),
      daysPlayed: count(stats.daysPlayed),
      currentStreak: count(stats.currentStreak),
      bestStreak: count(stats.bestStreak),
      lastPlayDay: typeof stats.lastPlayDay === 'string' && DAY_PATTERN.test(stats.lastPlayDay) ? stats.lastPlayDay : null,
      secondsById,
      dayGames: {
        day: typeof dayGames.day === 'string' && DAY_PATTERN.test(dayGames.day) ? dayGames.day : null,
        ids: idList(dayGames.ids, MAX_DAY_GAMES),
      },
      favoriteIds: idList(stats.favoriteIds, MAX_FAVORITES),
      addedGameIds: idList(stats.addedGameIds, MAX_ADDED_GAMES),
      luckyGameIds: idList(stats.luckyGameIds, MAX_ADDED_GAMES),
      secrets: idList(stats.secrets, SECRET_IDS.length).filter((id) => SECRET_IDS.includes(id)),
      themesTried: idList(stats.themesTried, MAX_THEMES_TRIED),
      genres: idList(stats.genres, MAX_GENRES).filter((id) => GENRE_PATTERN.test(id)),
      seriesDone: idList(stats.seriesDone, MAX_SERIES),
      trailerViews: count(stats.trailerViews),
      themeIds: idList(stats.themeIds, MAX_THEMES),
      screenshotsTaken: count(stats.screenshotsTaken),
      recordingsMade: count(stats.recordingsMade),
    },
    unlocked: Object.fromEntries(
      Object.entries(record(source.unlocked)).filter(
        (entry): entry is [string, number] => KNOWN_ACHIEVEMENT_IDS.has(entry[0]) && typeof entry[1] === 'number',
      ),
    ),
    launchDayById: Object.fromEntries(
      Object.entries(record(source.launchDayById))
        .slice(0, MAX_GAMES)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && DAY_PATTERN.test(entry[1])),
    ),
  };
};

const localDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Whole days since 1970 of a `YYYY-MM-DD` date, for counting days between two of them. */
const dayNumber = (day: string): number => {
  const [year, month, date] = day.split('-').map(Number);

  return Math.floor(Date.UTC(year, month - 1, date) / 86_400_000);
};

const dayOfYear = (date: Date): number =>
  Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000);

const isValidId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH;

const addOnce = (list: string[], id: string, limit: number): boolean => {
  if (list.includes(id) || list.length >= limit) {
    return false;
  }

  list.push(id);

  return true;
};

export const createProgress = (
  storage: ProgressStorage,
  callbacks: ProgressCallbacks,
  now: () => Date = () => new Date(),
) => {
  let cache: { profileId: string; data: ProgressData } | null = null;
  /** When and which game last closed, for launching a different one "without a break"; only meaningful within one run. */
  let lastEndedAt: number | null = null;
  let lastEndedGameId: string | null = null;

  const current = (): { profileId: string; data: ProgressData } | null => {
    const profileId = storage.getActiveId();

    if (!profileId) {
      cache = null;

      return null;
    }

    if (cache?.profileId !== profileId) {
      cache = { profileId, data: sanitize(storage.read(profileId)) };
    }

    return cache;
  };

  const viewOf = (data: ProgressData): ProgressView => {
    const level = levelFromXp(data.xp);
    const extra = { level, unlockedCount: Object.keys(data.unlocked).length };
    const metrics = new Set([...ACHIEVEMENTS.map((achievement) => achievement.metric), ...STATS_ONLY_METRICS]);

    return {
      xp: data.xp,
      level,
      levelStartXp: levelStartXp(level),
      nextLevelXp: levelStartXp(level + 1),
      values: Object.fromEntries(Array.from(metrics, (metric) => [metric, metricValue(metric, data.stats, extra)])) as Record<Metric, number>,
      unlocked: data.unlocked,
      achievements: ACHIEVEMENTS,
      hourWeekdayLaunches: data.stats.hourWeekdayLaunches,
      dailyPlaySeconds: data.stats.dailyPlaySeconds,
    };
  };

  /** Unlocks every measured achievement that is now earned; XP from an unlock can raise the level and unlock more, so it repeats. */
  const unlockEarned = (data: ProgressData): AchievementDef[] => {
    const unlockedNow: AchievementDef[] = [];
    let progressed = true;

    while (progressed) {
      progressed = false;

      const extra = { level: levelFromXp(data.xp), unlockedCount: Object.keys(data.unlocked).length };
      const earned = ACHIEVEMENTS.find(
        (achievement) =>
          achievement.metric !== 'special' &&
          !data.unlocked[achievement.id] &&
          metricValue(achievement.metric, data.stats, extra) >= achievement.target,
      );

      if (earned) {
        data.unlocked[earned.id] = Date.now();
        data.xp += earned.xp;
        unlockedNow.push(earned);
        progressed = true;
      }
    }

    return unlockedNow;
  };

  type Grant = (specialKey: string) => void;

  const mutate = (change: (data: ProgressData, grant: Grant, profileId: string) => void): void => {
    const entry = current();

    if (!entry) {
      return;
    }

    const levelBefore = levelFromXp(entry.data.xp);
    const granted: AchievementDef[] = [];

    const grant: Grant = (specialKey) => {
      const special = SPECIALS_BY_KEY.get(specialKey);

      if (!special || entry.data.unlocked[special.id]) {
        return;
      }

      entry.data.unlocked[special.id] = Date.now();
      entry.data.xp += special.xp;
      granted.push(special);
    };

    change(entry.data, grant, entry.profileId);

    const unlockedNow = [...granted, ...unlockEarned(entry.data)];
    const levelAfter = levelFromXp(entry.data.xp);

    storage.write(entry.profileId, entry.data).catch((err) => console.error('[progress] save failed:', err));
    callbacks.changed(viewOf(entry.data));

    unlockedNow.forEach((achievement) => callbacks.notify({ type: 'achievement', id: achievement.id }));

    if (levelAfter > levelBefore) {
      callbacks.notify({ type: 'level', level: levelAfter });
    }
  };

  const recordLaunch = (gameId: unknown): void => {
    if (!isValidId(gameId)) {
      return;
    }

    mutate((data, grant, profileId) => {
      const time = now();
      const day = localDay(time);
      const hour = time.getHours();
      const minute = time.getMinutes();
      const weekday = time.getDay();
      const month = time.getMonth() + 1;
      const date = time.getDate();
      const { stats } = data;
      const previousPlayDay = stats.lastPlayDay;
      const previousGameDay = data.launchDayById[gameId];

      stats.launches += 1;

      if (hour < 5) {
        stats.nightLaunches += 1;
      } else if (hour < 9) {
        stats.morningLaunches += 1;
      } else if (hour < 18) {
        stats.dayLaunches += 1;
      } else {
        stats.eveningLaunches += 1;
      }

      if (weekday === 0 || weekday === 6) {
        stats.weekendLaunches += 1;
      } else {
        stats.weekdayLaunches += 1;
      }

      stats.hourWeekdayLaunches[weekday * 24 + hour] += 1;

      if (stats.secondsById[gameId] === undefined && Object.keys(stats.secondsById).length < MAX_GAMES) {
        stats.secondsById[gameId] = 0;
      }

      if (previousPlayDay !== day) {
        const yesterday = localDay(new Date(time.getFullYear(), time.getMonth(), time.getDate() - 1));

        stats.daysPlayed += 1;
        stats.currentStreak = previousPlayDay === yesterday ? stats.currentStreak + 1 : 1;
        stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
        stats.lastPlayDay = day;
      }

      if (data.launchDayById[gameId] !== day && Object.keys(data.launchDayById).length < MAX_GAMES) {
        data.launchDayById[gameId] = day;
        data.xp += LAUNCH_XP;
      }

      if (stats.dayGames.day !== day) {
        stats.dayGames = { day, ids: [] };
      }

      addOnce(stats.dayGames.ids, gameId, MAX_DAY_GAMES);

      // the clock
      if (hour === 3 && minute === 33) {
        grant('witchingHour');
      }

      if (hour === 11 && minute === 11) {
        grant('makeAWish');
      }

      if (weekday >= 1 && weekday <= 5 && hour >= 10 && hour < 16) {
        grant('workingHours');
      }

      // the calendar
      if (month === 1 && date === 1) {
        grant('newYear');
      }

      if (month === 10 && date === 31) {
        grant('halloween');
      }

      if (weekday === 5 && date === 13) {
        grant('friday13');
      }

      if (month === 2 && date === 29) {
        grant('leapDay');
      }

      if (dayOfYear(time) === 256) {
        grant('programmersDay');
      }

      const createdAt = storage.getProfileCreatedAt(profileId);

      if (createdAt !== null) {
        const created = new Date(createdAt);

        if (time.getFullYear() > created.getFullYear() && month === created.getMonth() + 1 && date === created.getDate()) {
          grant('profileBirthday');
        }
      }

      // habits
      if (lastEndedAt !== null && gameId !== lastEndedGameId && time.getTime() - lastEndedAt <= CHAIN_WINDOW_MS) {
        grant('noBreak');
      }

      if (previousGameDay) {
        const daysAway = dayNumber(day) - dayNumber(previousGameDay);

        if (daysAway >= 30) {
          grant('oldLove30');
        }

        if (daysAway >= 90) {
          grant('oldLove90');
        }

        if (daysAway >= 365) {
          grant('oldLove365');
        }
      }

      if (previousPlayDay && dayNumber(day) - dayNumber(previousPlayDay) >= 30) {
        grant('longTimeNoSee');
      }

      if (stats.dayGames.ids.length >= 3) {
        grant('multitasker');
      }

      if (stats.dayGames.ids.length >= 5) {
        grant('taster');
      }
    });
  };

  const recordSession = (gameId: unknown, seconds: unknown): void => {
    if (!isValidId(gameId)) {
      return;
    }

    lastEndedAt = now().getTime();
    lastEndedGameId = gameId;

    const length = typeof seconds === 'number' && Number.isFinite(seconds) ? Math.min(Math.round(seconds), MAX_SESSION_SECONDS) : 0;

    if (length <= 0) {
      return;
    }

    mutate((data, grant) => {
      const { stats } = data;
      const day = localDay(now());

      stats.playSeconds += length;
      stats.sessionCount += 1;
      stats.longestSessionSeconds = Math.max(stats.longestSessionSeconds, length);
      stats.secondsById[gameId] = (stats.secondsById[gameId] ?? 0) + length;
      data.xp += Math.min(Math.floor(length / SECONDS_PER_XP), MAX_SESSION_XP);

      const dayLog = (stats.dailyPlaySeconds[day] ??= {});

      if (dayLog[gameId] !== undefined || Object.keys(dayLog).length < MAX_GAMES_PER_DAY_LOG) {
        dayLog[gameId] = (dayLog[gameId] ?? 0) + length;
      }

      const days = Object.keys(stats.dailyPlaySeconds);

      if (days.length > MAX_DAILY_LOG_DAYS) {
        delete stats.dailyPlaySeconds[days.sort()[0]];
      }

      if (length < 60) {
        grant('falseAlarm');
      }

      if (Math.abs(length - ANSWER_SESSION_SECONDS) <= 60) {
        grant('answer42');
      }
    });
  };

  /**
   * Things only the renderer can see happen. Each kind is checked against what it may say (an id list, a
   * pattern, the clock) and counts once per distinct id where that makes sense, so repeating earns nothing.
   */
  const recordEvent = (kind: unknown, id: unknown): void => {
    if (!isValidId(id)) {
      return;
    }

    switch (kind) {
      case 'favorite':
        mutate((data) => {
          if (addOnce(data.stats.favoriteIds, id, MAX_FAVORITES)) {
            data.xp += FAVORITE_XP;
          }
        });
        break;
      case 'game':
        mutate((data) => {
          if (addOnce(data.stats.addedGameIds, id, MAX_ADDED_GAMES)) {
            data.xp += GAME_ADDED_XP;
          }
        });
        break;
      case 'lucky':
        mutate((data) => {
          if (addOnce(data.stats.luckyGameIds, id, MAX_ADDED_GAMES)) {
            data.xp += LUCKY_XP;
          }
        });
        break;
      case 'secret':
        if (SECRET_IDS.includes(id)) {
          mutate((data, grant) => {
            if (addOnce(data.stats.secrets, id, SECRET_IDS.length)) {
              data.xp += SECRET_XP;

              if (SECRET_SPECIALS[id]) {
                grant(SECRET_SPECIALS[id]);
              }
            }
          });
        }

        break;
      case 'theme':
        if (THEME_ID_PATTERN.test(id)) {
          mutate((data) => {
            if (addOnce(data.stats.themeIds, id, MAX_THEMES)) {
              data.xp += THEME_XP;
            }
          });
        }

        break;
      case 'themeUsed':
        if (PRESET_THEME_IDS.includes(id) || THEME_ID_PATTERN.test(id)) {
          mutate((data) => {
            addOnce(data.stats.themesTried, id, MAX_THEMES_TRIED);
          });
        }

        break;
      case 'feature':
        if (FEATURE_SPECIALS[id] && (id !== 'light-at-night' || now().getHours() < 5)) {
          mutate((_data, grant) => grant(FEATURE_SPECIALS[id]));
        }

        break;
      case 'trailer':
        mutate((data) => {
          data.stats.trailerViews += 1;
        });

        break;
      case 'genre':
        if (GENRE_PATTERN.test(id)) {
          mutate((data) => {
            addOnce(data.stats.genres, id, MAX_GENRES);
          });
        }

        break;
      case 'series':
        if (id.length <= MAX_SERIES_NAME) {
          mutate((data) => {
            addOnce(data.stats.seriesDone, id, MAX_SERIES);
          });
        }

        break;
      case 'screenshot':
        mutate((data) => {
          data.stats.screenshotsTaken += 1;
        });

        break;
      case 'recording':
        mutate((data) => {
          data.stats.recordingsMade += 1;
        });

        break;
      default:
        break;
    }
  };

  /** Something the main process itself did for the user (see `launcherActions.ts`). */
  const recordAction = (action: unknown): void => {
    const special = typeof action === 'string' ? ACTION_SPECIALS[action as LauncherAction] : undefined;

    if (special) {
      mutate((_data, grant) => grant(special));
    }
  };

  const getView = (): ProgressView | null => {
    const entry = current();

    return entry ? viewOf(entry.data) : null;
  };

  return { recordLaunch, recordSession, recordEvent, recordAction, getView };
};
