/**
 * Achievement rules, XP and levels. Lives in the main process, which measures launches and play
 * sessions itself, so none of these numbers are taken on the renderer's word.
 *
 * Two kinds of achievement:
 *  - a step of a "family" (a metric with rising targets, e.g. launches 1 / 10 / 25 …), id `<metric>-<target>`;
 *  - a "special": a one-off that is granted directly when its event happens, id `special-<key>`.
 * The renderer keeps only the titles and icons for those ids (`src/app/lib/achievements.ts`).
 */

export type Tier = 'bronze' | 'silver' | 'gold';

export type Metric =
  | 'launches'
  | 'playHours'
  | 'gamesPlayed'
  | 'longestSessionHours'
  | 'nightLaunches'
  | 'morningLaunches'
  | 'dayLaunches'
  | 'eveningLaunches'
  | 'weekendLaunches'
  | 'weekdayLaunches'
  | 'avgSessionMinutes'
  | 'daysPlayed'
  | 'bestStreak'
  | 'maxGameHours'
  | 'favoritesAdded'
  | 'gamesAdded'
  | 'luckyOpens'
  | 'themesTried'
  | 'trailerViews'
  | 'genresPlayed'
  | 'seriesCompleted'
  | 'cheatCodes'
  | 'themesCreated'
  | 'screenshotsTaken'
  | 'recordingsMade'
  | 'level'
  | 'achievements'
  | 'special';

/** Where a group of achievements is listed; specials (and the secret cheat-code family) belong to one. */
export type Group = 'calendar' | 'habits' | 'launcher' | 'library' | 'secrets';

export interface AchievementDef {
  id: string;
  metric: Metric;
  target: number;
  tier: Tier;
  xp: number;
  group?: Group;
  /** Secret: the renderer shows neither its name nor its description until it is unlocked. */
  hidden?: boolean;
}

export interface ProgressStats {
  launches: number;
  playSeconds: number;
  /** One per `recordSession` call, for the average session length shown on the stats page. */
  sessionCount: number;
  longestSessionSeconds: number;
  nightLaunches: number;
  morningLaunches: number;
  dayLaunches: number;
  eveningLaunches: number;
  weekendLaunches: number;
  weekdayLaunches: number;
  /** Launches per (weekday × 24 + hour) bucket, for the "active hours" heatmap. */
  hourWeekdayLaunches: number[];
  /** Seconds played per game id, per local day, for the last `DAILY_LOG_MAX_DAYS` days — the activity
   * calendar, the month-over-month trend and "favourite genre this month" all read from this (the
   * renderer already has each game's genre, so the main process doesn't need to track it itself). */
  dailyPlaySeconds: Record<string, Record<string, number>>;
  daysPlayed: number;
  currentStreak: number;
  bestStreak: number;
  /** Local date (`YYYY-MM-DD`) of the last launch. */
  lastPlayDay: string | null;
  /** Seconds played per game id; its size is the number of different games played. */
  secondsById: Record<string, number>;
  /** The games launched on `day`, to tell when several different ones were played in one day. */
  dayGames: { day: string | null; ids: string[] };
  favoriteIds: string[];
  /** Ids of the games added to the gallery through the "Add a game" wizard. */
  addedGameIds: string[];
  /** Ids of the games opened after a spin of the "Feeling Lucky" reel. */
  luckyGameIds: string[];
  /** Ids (see `SECRET_IDS`) of the typed secrets the user has found. */
  secrets: string[];
  /** Themes the user has switched to (preset ids and custom ids). */
  themesTried: string[];
  /** Genre keys (e.g. `genre.action`) of the games launched. */
  genres: string[];
  /** Names of the series whose games have all been launched. */
  seriesDone: string[];
  trailerViews: number;
  themeIds: string[];
  screenshotsTaken: number;
  recordingsMade: number;
}

export const TIER_XP: Record<Tier, number> = { bronze: 25, silver: 75, gold: 200 };

/** XP for the first launch of a game on a given day, for each full minute played, and for the small one-off events. */
export const LAUNCH_XP = 10;
export const SECONDS_PER_XP = 60;
export const FAVORITE_XP = 5;
export const GAME_ADDED_XP = 15;
export const LUCKY_XP = 5;
export const SECRET_XP = 50;
export const THEME_XP = 20;

/** Typed secrets the renderer may report; each may also grant a special (see `SECRET_SPECIALS`). */
export const CHEAT_CODES = ['iddqd', 'idkfa', 'idclip', 'hesoyam', 'aezakmi', 'baguvix', 'rosebud', 'motherlode', 'xyzzy', 'noclip'] as const;
export const SECRET_IDS: readonly string[] = ['hello-world', 'konami', ...CHEAT_CODES.map((code) => `cheat-${code}`)];
export const SECRET_SPECIALS: Record<string, string> = { 'hello-world': 'helloWorld', konami: 'konami' };

/** Feature-use facts the renderer may report; each grants the special of that name (`light-at-night` is checked against the clock here). */
export const FEATURE_SPECIALS: Record<string, string> = {
  manual: 'manual',
  'light-at-night': 'lightAtNight',
  'low-rated': 'lowRated',
  'high-rated': 'highRated',
  retro: 'retro',
};

export const PRESET_THEME_IDS: readonly string[] = ['dark', 'light', 'amoled', 'midnight', 'dracula', 'nord', 'forest', 'crimson', 'cyberpunk', 'sepia'];

const FAMILIES: Array<{ metric: Metric; steps: Array<[target: number, tier: Tier, xp?: number]>; group?: Group; hidden?: boolean }> = [
  // The first step of launches/gamesPlayed/daysPlayed always unlocks together, from the same very first
  // launch — a reduced starter XP keeps that trio from immediately cascading into a level-up avalanche
  // (see `unlockEarned` in progress.ts, which lets an unlock's XP unlock further achievements).
  { metric: 'launches', steps: [[1, 'bronze', 10], [10, 'bronze'], [25, 'bronze'], [50, 'silver'], [100, 'silver'], [250, 'silver'], [500, 'gold'], [1000, 'gold']] },
  { metric: 'playHours', steps: [[1, 'bronze'], [5, 'bronze'], [10, 'bronze'], [25, 'silver'], [50, 'silver'], [100, 'silver'], [250, 'gold'], [500, 'gold'], [1000, 'gold']] },
  { metric: 'gamesPlayed', steps: [[1, 'bronze', 10], [3, 'bronze'], [5, 'bronze'], [10, 'silver'], [15, 'silver'], [25, 'silver'], [40, 'gold'], [60, 'gold']] },
  { metric: 'longestSessionHours', steps: [[1, 'bronze'], [2, 'bronze'], [3, 'silver'], [5, 'silver'], [8, 'gold'], [12, 'gold']] },
  // First step raised from 1 to 2: with a 1-launch threshold this fired together with the guaranteed
  // launches-1/gamesPlayed-1/daysPlayed-1 trio on literally the first ever launch; needing a second
  // night/morning/weekend launch decouples it from that opening burst.
  { metric: 'nightLaunches', steps: [[2, 'bronze'], [5, 'bronze'], [15, 'silver'], [30, 'silver'], [75, 'gold'], [150, 'gold']] },
  { metric: 'morningLaunches', steps: [[2, 'bronze'], [5, 'bronze'], [15, 'silver'], [30, 'silver'], [75, 'gold']] },
  { metric: 'weekendLaunches', steps: [[2, 'bronze'], [5, 'bronze'], [15, 'silver'], [40, 'silver'], [100, 'gold']] },
  { metric: 'daysPlayed', steps: [[1, 'bronze', 10], [3, 'bronze'], [7, 'bronze'], [14, 'silver'], [30, 'silver'], [60, 'silver'], [100, 'gold'], [200, 'gold'], [365, 'gold']] },
  { metric: 'bestStreak', steps: [[2, 'bronze'], [3, 'bronze'], [5, 'silver'], [7, 'silver'], [14, 'silver'], [30, 'gold'], [60, 'gold']] },
  { metric: 'maxGameHours', steps: [[1, 'bronze'], [5, 'bronze'], [10, 'silver'], [25, 'silver'], [50, 'gold'], [100, 'gold']] },
  { metric: 'favoritesAdded', steps: [[1, 'bronze'], [3, 'bronze'], [5, 'bronze'], [10, 'silver'], [25, 'silver'], [50, 'gold']] },
  { metric: 'gamesAdded', steps: [[1, 'bronze'], [3, 'bronze'], [5, 'silver'], [10, 'silver'], [25, 'gold'], [50, 'gold']] },
  { metric: 'luckyOpens', steps: [[1, 'bronze']] },
  { metric: 'themesTried', steps: [[3, 'bronze'], [6, 'silver'], [10, 'gold']] },
  { metric: 'trailerViews', steps: [[20, 'bronze'], [100, 'silver'], [300, 'gold']] },
  { metric: 'genresPlayed', steps: [[3, 'bronze'], [5, 'silver'], [8, 'gold']] },
  { metric: 'seriesCompleted', steps: [[1, 'silver'], [3, 'gold'], [5, 'gold']] },
  { metric: 'cheatCodes', steps: [[1, 'bronze'], [3, 'silver'], [5, 'silver'], [8, 'gold']], group: 'secrets', hidden: true },
  { metric: 'themesCreated', steps: [[1, 'bronze'], [3, 'silver'], [5, 'silver'], [10, 'gold']] },
  { metric: 'screenshotsTaken', steps: [[1, 'bronze'], [5, 'bronze'], [15, 'silver'], [40, 'silver'], [100, 'gold']] },
  { metric: 'recordingsMade', steps: [[1, 'bronze'], [5, 'bronze'], [15, 'silver'], [40, 'silver'], [100, 'gold']] },
  { metric: 'level', steps: [[2, 'bronze'], [3, 'bronze'], [5, 'bronze'], [8, 'silver'], [10, 'silver'], [15, 'silver'], [20, 'gold'], [25, 'gold'], [30, 'gold']] },
  { metric: 'achievements', steps: [[5, 'bronze'], [10, 'bronze'], [20, 'silver'], [35, 'silver'], [50, 'gold'], [75, 'gold'], [100, 'gold'], [125, 'gold']] },
];

/** One-off achievements, granted directly by `progress.ts` when their event happens. */
export const SPECIALS = [
  // secrets
  { key: 'helloWorld', tier: 'silver', group: 'secrets', hidden: true },
  { key: 'konami', tier: 'gold', group: 'secrets', hidden: true },
  { key: 'answer42', tier: 'silver', group: 'secrets', hidden: true },
  { key: 'witchingHour', tier: 'silver', group: 'secrets', hidden: true },
  { key: 'makeAWish', tier: 'bronze', group: 'secrets', hidden: true },
  // calendar
  { key: 'newYear', tier: 'bronze', group: 'calendar' },
  { key: 'halloween', tier: 'bronze', group: 'calendar' },
  { key: 'friday13', tier: 'silver', group: 'calendar' },
  { key: 'leapDay', tier: 'gold', group: 'calendar' },
  { key: 'programmersDay', tier: 'silver', group: 'calendar' },
  { key: 'profileBirthday', tier: 'gold', group: 'calendar' },
  // habits
  { key: 'falseAlarm', tier: 'bronze', group: 'habits' },
  { key: 'noBreak', tier: 'bronze', group: 'habits' },
  { key: 'oldLove30', tier: 'bronze', group: 'habits' },
  { key: 'oldLove90', tier: 'silver', group: 'habits' },
  { key: 'oldLove365', tier: 'gold', group: 'habits' },
  { key: 'longTimeNoSee', tier: 'silver', group: 'habits' },
  { key: 'multitasker', tier: 'bronze', group: 'habits' },
  { key: 'taster', tier: 'silver', group: 'habits' },
  { key: 'workingHours', tier: 'bronze', group: 'habits' },
  // launcher
  { key: 'backup', tier: 'bronze', group: 'launcher' },
  { key: 'restore', tier: 'silver', group: 'launcher' },
  { key: 'manual', tier: 'bronze', group: 'launcher' },
  { key: 'bonus', tier: 'bronze', group: 'launcher' },
  { key: 'installer', tier: 'bronze', group: 'launcher' },
  { key: 'tweaker', tier: 'bronze', group: 'launcher' },
  { key: 'emergencyExit', tier: 'bronze', group: 'launcher' },
  { key: 'editor', tier: 'bronze', group: 'launcher' },
  { key: 'lightAtNight', tier: 'silver', group: 'launcher' },
  { key: 'diskScan', tier: 'bronze', group: 'launcher' },
  // library
  { key: 'lowRated', tier: 'bronze', group: 'library' },
  { key: 'highRated', tier: 'bronze', group: 'library' },
  { key: 'retro', tier: 'silver', group: 'library' },
] as const satisfies ReadonlyArray<{ key: string; tier: Tier; group: Group; hidden?: boolean }>;

/** Tracked and shown on the stats page (the "when you play" chart), but with no achievement family of their own. */
export const STATS_ONLY_METRICS: Metric[] = ['dayLaunches', 'weekdayLaunches', 'eveningLaunches', 'avgSessionMinutes'];

export type SpecialKey = (typeof SPECIALS)[number]['key'];

export const SPECIAL_ID_PREFIX = 'special-';

export const ACHIEVEMENTS: AchievementDef[] = [
  ...FAMILIES.flatMap(({ metric, steps, group, hidden }) =>
    steps.map(([target, tier, xp]) => ({
      id: `${metric}-${target}`,
      metric,
      target,
      tier,
      xp: xp ?? TIER_XP[tier],
      ...(group ? { group } : {}),
      ...(hidden ? { hidden: true } : {}),
    })),
  ),
  ...SPECIALS.map((special) => ({
    id: `${SPECIAL_ID_PREFIX}${special.key}`,
    metric: 'special' as const,
    target: 1,
    tier: special.tier,
    xp: TIER_XP[special.tier],
    group: special.group,
    ...('hidden' in special ? { hidden: true as const } : {}),
  })),
];

/** Level `n` starts at `30 · (n-1)²` XP: 30, 120, 270, … so early levels come fast and later ones take real play time. */
const XP_PER_LEVEL_UNIT = 30;

export const levelFromXp = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / XP_PER_LEVEL_UNIT)) + 1;

export const levelStartXp = (level: number): number => XP_PER_LEVEL_UNIT * (level - 1) ** 2;

export const emptyStats = (): ProgressStats => ({
  launches: 0,
  playSeconds: 0,
  sessionCount: 0,
  longestSessionSeconds: 0,
  nightLaunches: 0,
  morningLaunches: 0,
  dayLaunches: 0,
  eveningLaunches: 0,
  weekendLaunches: 0,
  weekdayLaunches: 0,
  hourWeekdayLaunches: new Array(168).fill(0),
  dailyPlaySeconds: {},
  daysPlayed: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayDay: null,
  secondsById: {},
  dayGames: { day: null, ids: [] },
  favoriteIds: [],
  addedGameIds: [],
  luckyGameIds: [],
  secrets: [],
  themesTried: [],
  genres: [],
  seriesDone: [],
  trailerViews: 0,
  themeIds: [],
  screenshotsTaken: 0,
  recordingsMade: 0,
});

/** Current value of a metric; `level` and `achievements` come from outside the stats, `special` is granted, not measured. */
export const metricValue = (
  metric: Metric,
  stats: ProgressStats,
  extra: { level: number; unlockedCount: number },
): number => {
  switch (metric) {
    case 'launches':
      return stats.launches;
    case 'playHours':
      return Math.floor(stats.playSeconds / 3600);
    case 'gamesPlayed':
      return Object.keys(stats.secondsById).length;
    case 'longestSessionHours':
      return Math.floor(stats.longestSessionSeconds / 3600);
    case 'nightLaunches':
      return stats.nightLaunches;
    case 'morningLaunches':
      return stats.morningLaunches;
    case 'dayLaunches':
      return stats.dayLaunches;
    case 'eveningLaunches':
      return stats.eveningLaunches;
    case 'weekendLaunches':
      return stats.weekendLaunches;
    case 'weekdayLaunches':
      return stats.weekdayLaunches;
    case 'avgSessionMinutes':
      return stats.sessionCount > 0 ? Math.floor(stats.playSeconds / stats.sessionCount / 60) : 0;
    case 'daysPlayed':
      return stats.daysPlayed;
    case 'bestStreak':
      return stats.bestStreak;
    case 'maxGameHours':
      return Math.floor(Math.max(0, ...Object.values(stats.secondsById)) / 3600);
    case 'favoritesAdded':
      return stats.favoriteIds.length;
    case 'gamesAdded':
      return stats.addedGameIds.length;
    case 'luckyOpens':
      return stats.luckyGameIds.length;
    case 'themesTried':
      return stats.themesTried.length;
    case 'trailerViews':
      return stats.trailerViews;
    case 'genresPlayed':
      return stats.genres.length;
    case 'seriesCompleted':
      return stats.seriesDone.length;
    case 'cheatCodes':
      return stats.secrets.filter((id) => id.startsWith('cheat-')).length;
    case 'themesCreated':
      return stats.themeIds.length;
    case 'screenshotsTaken':
      return stats.screenshotsTaken;
    case 'recordingsMade':
      return stats.recordingsMade;
    case 'level':
      return extra.level;
    case 'achievements':
      return extra.unlockedCount;
    case 'special':
      return 0;
  }
};
