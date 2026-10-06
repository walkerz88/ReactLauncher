/**
 * Types for the bridge exposed by `electron/preload.ts` via
 * `contextBridge.exposeInMainWorld('electronAPI', ...)`.
 */

/** Localized text from `config.json` (`{ ru, en }`). */
export interface LocalizedText {
  ru: string | null;
  en: string | null;
}

/** A fact row from `config.json` — a localized label (e.g. "Release year") and localized value. */
export interface AppFact {
  label: LocalizedText;
  value: LocalizedText;
}

/** A user-defined shortcut button (`config.json`'s `customButtons`), shown next to Play/Install. */
export interface CustomButton {
  label: LocalizedText;
  /** Whether the configured path currently resolves to a real file/folder. */
  exists: boolean;
}

/** Severity of a `previewNotes` message; drives the icon/color of the `Message` component. */
export type PreviewNoteType = 'info' | 'success' | 'warning' | 'error' | 'award';

/** Note shown under the actions row on the app page, from `config.json`'s `previewNotes`. */
export interface PreviewNote {
  text: LocalizedText;
  type: PreviewNoteType;
}

/** One application discovered under `./content`. */
export interface ContentApp {
  /** Folder name — stable id. */
  id: string;
  /** Display name (from `config.json`, falls back to the folder name). */
  name: string;
  /** Short description from `config.json` (ru/en), or `null`. */
  description: LocalizedText | null;
  /** Setup / compatibility instructions from `config.json` (ru/en), or `null`. */
  instructions: LocalizedText | null;
  /** Critic score on a 0-10 scale (e.g. Metacritic / 10) from `config.json`, or `null`. */
  rating: number | null;
  /** Where the trailer preview on the gallery card starts, 0-100 % of the trailer's length, or `null` for the default. */
  previewStart: number | null;
  /** i18n key for the genre bucket (e.g. `genre.action`) from `config.json`, or `null`. */
  genre: string | null;
  /** Franchise/series name (shown as-is, not localized) from `config.json`, or `null`. */
  series: string | null;
  /** CSS `object-position` keyword for the hero image, from `config.json`; defaults to `center`. */
  coverHorizontalPosition: 'top' | 'center' | 'bottom';
  /** Extra facts (year, developer, …) from `config.json`; `[]` if none. */
  facts: AppFact[];
  /** User-defined shortcut buttons from `config.json`'s `customButtons`; `[]` if none. */
  customButtons: CustomButton[];
  /** Notes shown under the actions row on the app page (e.g. a compatibility warning), stacked in order; `[]` if none. */
  previewNotes: PreviewNote[];
  /** `content://` URL of the horizontal cover, or `null` if absent. */
  coverHorizontal: string | null;
  /** `content://` URL of the vertical cover, or `null` if absent. */
  coverVertical: string | null;
  /** Whether an executable was resolved for this app. */
  hasExec: boolean;
  /** Whether `config.json`'s `paths.settings` resolved to a real file (external config/tweak tool). */
  hasSettings: boolean;
  /** Whether `paths.installer` resolved to a file, or the app folder has an `installer/` sub-folder. */
  hasInstaller: boolean;
  /** Whether the app folder has a non-empty `data/` sub-folder. */
  hasDataFiles: boolean;
  /** Whether `paths.bonus` (a file or a folder; defaults to a non-empty `bonus/` folder) resolved to something. */
  hasBonusContent: boolean;
  /** `content://` URLs of the game's screenshots (`screenshots/` folder), in file-name order; `[]` if none. */
  screenshots: string[];
  /** `content://` URL of the trailer video (`paths.trailer`, default `assets/trailer.mp4`), or `null`. */
  trailer: string | null;
  /** Whether `paths.saves` is configured, so backups can be offered. */
  hasSaves: boolean;
  /** When the game folder was created, ms since epoch, or `null` if unknown. */
  addedAt: number | null;
}

/** Total and free space, in bytes, on the volume the content folder lives on. */
export interface DiskSpace {
  total: number;
  free: number;
}

/** Bytes on disk per part of a game folder; `null` where that part is absent. */
export interface AppSizes {
  installer: number | null;
  data: number | null;
  trailer: number | null;
  screenshots: number | null;
  covers: number | null;
  bonus: number | null;
}

/** Result of scanning the content directory. */
export interface ContentLibrary {
  /** Absolute path that was scanned (shown to the user when empty). */
  dir: string;
  apps: ContentApp[];
}

export interface LaunchResult {
  ok: boolean;
  error?: string;
}

/**
 * Raw `config.json` shape, as read from / written to disk — distinct from
 * `ContentApp`, which is the resolved/normalized shape sent for display.
 * Every field is optional; omitted fields fall back to on-disk conventions
 * (see `electron/content.ts`'s `scanContent`).
 */
export interface RawAppConfig {
  name?: string;
  description?: Partial<LocalizedText> | string;
  instructions?: Partial<LocalizedText> | string;
  rating?: number;
  previewStart?: number;
  genre?: string;
  series?: string;
  coverHorizontalPosition?: string;
  facts?: Array<{ label: Partial<LocalizedText> | string; value: Partial<LocalizedText> | string }>;
  /** User-defined shortcut buttons, shown next to Play/Install on the app page. */
  customButtons?: Array<{ label: Partial<LocalizedText> | string; path?: string }>;
  previewNotes?: Array<{
    text: Partial<LocalizedText> | string;
    type?: PreviewNoteType;
  }>;
  /** How the game is started. */
  launch?: {
    /** Command-line arguments, e.g. `-windowed`. */
    args?: string;
  };
  paths?: {
    exec?: string;
    settings?: string;
    installer?: string;
    coverHorizontal?: string;
    coverVertical?: string;
    bonus?: string;
    screenshots?: string;
    trailer?: string;
    /** Saves folder/file to back up; may be absolute or use `%DOCUMENTS%`, `%APPDATA%`, … */
    saves?: string;
  };
}

export interface CreateAppResult {
  ok: boolean;
  /** Folder name of the new app (its stable id). Present only when `ok`. */
  id?: string;
  error?: string;
}

export interface ConfigResult {
  ok: boolean;
  config?: RawAppConfig;
  error?: string;
}

/** Which `paths.*` field a native picker dialog is filling in. */
export type PathField =
  | 'exec'
  | 'settings'
  | 'installer'
  | 'coverHorizontal'
  | 'coverVertical'
  | 'bonus'
  | 'screenshots'
  | 'trailer'
  | 'saves'
  | 'customButton';

/** Sent by the main process whenever a tracked game starts or exits. */
export interface RunningEvent {
  type: 'started' | 'ended';
  id: string;
  /** Session length in seconds; present only on `ended`. */
  seconds?: number;
  /** Ids of every game that is running after this event. */
  running: string[];
}

export interface BackupEntry {
  name: string;
  size: number;
  /** Creation time, ms since epoch. */
  createdAt: number;
}

export interface BackupResult {
  ok: boolean;
  /** The updated list of backups (newest first). */
  backups?: BackupEntry[];
  error?: string;
}

export interface PickPathResult {
  ok: boolean;
  /** Path relative to the app's own folder, `/`-separated. Present only when `ok`. */
  path?: string;
  error?: string;
}

export interface ProfileMeta {
  id: string;
  name: string;
  createdAt: number;
}

export interface ProfileIndex {
  profiles: ProfileMeta[];
  activeId: string | null;
}

/** The profile list and the raw persisted stores (name → JSON string) of the active profile. */
export interface ProfileSnapshot {
  index: ProfileIndex;
  stores: Record<string, string>;
}

export interface ProfilesAPI {
  /** Read synchronously at startup, before the persisted stores are created. */
  loadSync: () => ProfileSnapshot;
  saveStore: (id: string, name: string, value: string) => Promise<void>;
  /** Adds the profile (with the given initial stores) and makes it active. Resolves to the new profile list. */
  create: (profile: ProfileMeta, stores: Record<string, string>) => Promise<ProfileIndex>;
  switch: (id: string) => Promise<ProfileIndex>;
  rename: (id: string, name: string) => Promise<ProfileIndex>;
  remove: (id: string) => Promise<ProfileIndex>;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export type ProgressMetric =
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

export type AchievementGroup = 'calendar' | 'habits' | 'launcher' | 'library' | 'secrets';

export interface AchievementDef {
  /** `<metric>-<target>`. */
  id: string;
  metric: ProgressMetric;
  target: number;
  tier: AchievementTier;
  xp: number;
  /** Set on one-off achievements (and the secret cheat-code family): where they are listed. */
  group?: AchievementGroup;
  /** Secret: name and description stay hidden until it is unlocked. */
  hidden?: boolean;
}

/** The active profile's progress, computed by the main process. */
export interface ProgressView {
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  /** Current value of every metric an achievement is measured by. */
  values: Record<ProgressMetric, number>;
  /** Achievement id → when it was unlocked, ms since epoch. */
  unlocked: Record<string, number>;
  achievements: AchievementDef[];
  /** Launches per (weekday × 24 + hour) bucket — the "active hours" heatmap. */
  hourWeekdayLaunches: number[];
  /** Seconds played per game id, per local day (`YYYY-MM-DD`), for roughly the last 13 months. */
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
  | 'series';

export interface ProgressAPI {
  /** `null` while no profile is active. */
  get: () => Promise<ProgressView | null>;
  /** Reports something only the window sees (a favourite, a found secret, a genre played, …); the main process checks it and counts it once per distinct id. */
  event: (kind: ProgressEventKind, id: string) => Promise<void>;
  onChanged: (callback: (view: ProgressView | null) => void) => () => void;
  onNotify: (callback: (notification: ProgressNotification) => void) => () => void;
}

export interface SteamSearchResult {
  id: string;
  name: string;
}

export interface SteamInfo {
  appId: string;
  name: string;
  /** i18n genre key (e.g. `genre.action`), or `null` if Steam's genres don't map to one. */
  genre: string | null;
  /** 0-10, from the Metacritic score when Steam has one. */
  rating: number | null;
  description: { ru: string | null; en: string | null };
  facts: Array<{ label: { ru: string; en: string }; value: string }>;
}

export interface SteamAssetsResult {
  covers: boolean;
  screenshots: number;
  trailer: boolean;
}

/** Which pieces to fetch — omit a flag (or the whole object) to fetch everything, as the "add a game"
 * wizard does; the library health check's bulk fill turns off whatever a game already has. */
export interface DownloadSteamAssetsOptions {
  horizontal?: boolean;
  vertical?: boolean;
  trailer?: boolean;
  screenshots?: boolean;
}

/** The player's own screenshots/clips for one game, as `media://` URLs (newest last). */
export interface CaptureList {
  screenshots: string[];
  recordings: string[];
}

export interface CaptureAPI {
  list: (gameId: string) => Promise<CaptureList>;
  /** Bytes taken by the player's own screenshots and recordings, by game id (active profile only). */
  sizes: () => Promise<Record<string, number>>;
  /** Hands the finished recording's bytes to the main process to write to disk. */
  saveRecording: (gameId: string, bytes: ArrayBuffer) => Promise<void>;
  /** Tells the main process how long a recording may run before it stops on its own. */
  setMaxRecordingSeconds: (seconds: number) => Promise<void>;
  /** Tells the main process whether to show the on-screen recording timer. */
  setShowRecordingTimer: (show: boolean) => Promise<void>;
  /** Deletes one of the player's own screenshots/recordings by its `media://` URL. */
  delete: (url: string) => Promise<boolean>;
  /** Opens the OS file manager with this screenshot/recording selected, by its `media://` URL. */
  reveal: (url: string) => Promise<boolean>;
  onScreenshotTaken: (callback: (event: { gameId: string }) => void) => () => void;
  onRecordingSaved: (callback: (event: { gameId: string }) => void) => () => void;
  /** F10 was pressed while no recording was running: start capturing this screen source. */
  onStartRecording: (callback: (event: { gameId: string; sourceId: string; maxSeconds: number }) => void) => () => void;
  /** F10 was pressed again, the game ended, or the max length was reached: stop and hand back the bytes. */
  onStopRecording: (callback: () => void) => () => void;
}

/** One changelog entry as published in the update manifest (same shape as `app/lib/changelog.json`). */
export interface UpdateChangelogEntry {
  version: string;
  date?: string;
  title: { ru: string; en: string };
  changes: { ru: string; en: string }[];
}

export interface UpdateInfo {
  version: string;
  /** Entries between the running version (exclusive) and the new one (inclusive), newest first. */
  changelog: UpdateChangelogEntry[];
}

export type UpdateCheckResult =
  | { status: 'disabled' }
  | { status: 'current' }
  | { status: 'error' }
  | { status: 'available'; update: UpdateInfo };

export type UpdateInstallResult =
  | { status: 'restarting' }
  | { status: 'downloaded'; path: string }
  | { status: 'error' };

export interface ElectronAPI {
  /** Quit the whole application. */
  quit: () => Promise<void>;
  /** Open a link in the OS default browser or mail client (rejected unless it's http/https/mailto). */
  openExternal: (url: string) => Promise<void>;
  window: {
    isFullscreen: () => Promise<boolean>;
    /** Toggle fullscreen; resolves to the new state. */
    toggleFullscreen: () => Promise<boolean>;
    /** Subscribe to fullscreen changes; returns an unsubscribe function. */
    onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
    /** Minimize the window to the taskbar. */
    minimize: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    /** Toggle maximize/restore; resolves to the new state. */
    toggleMaximize: () => Promise<boolean>;
    /** Subscribe to maximize/restore changes; returns an unsubscribe function. */
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;
    /** Close the window (quits the app, mirroring the OS close button). */
    close: () => Promise<void>;
  };
  profiles: ProfilesAPI;
  progress: ProgressAPI;
  steam: {
    /** Search the Steam store by title (empty on failure or no match). */
    search: (term: string) => Promise<SteamSearchResult[]>;
    /** Game data for a Steam app id, in both languages; `null` if Steam has nothing for it. */
    info: (steamAppId: string) => Promise<SteamInfo | null>;
  };
  update: {
    /** Fetch the update manifest (`package.json`'s `updates.manifestUrl`) and compare it with the running version. */
    check: () => Promise<UpdateCheckResult>;
    /** Download the update found by the last `check`; the portable build then replaces itself and restarts. */
    install: () => Promise<UpdateInstallResult>;
    /** Bytes downloaded so far and the file size (0 if unknown); returns an unsubscribe function. */
    onProgress: (callback: (progress: { received: number; total: number }) => void) => () => void;
  };
  translate: {
    /** Machine-translates `text` (source language auto-detected) into `target`; `null` on failure. */
    text: (text: string, target: 'ru' | 'en') => Promise<string | null>;
  };
  content: {
    list: () => Promise<ContentLibrary>;
    launch: (id: string) => Promise<LaunchResult>;
    /** Launch the app's external settings tool (`paths.settings` in config.json). */
    openSettings: (id: string) => Promise<LaunchResult>;
    openInstaller: (id: string) => Promise<LaunchResult>;
    /** Open the app's `data/` folder in the OS file manager. */
    openData: (id: string) => Promise<LaunchResult>;
    /** Open the app's root content folder (contains `data/`, `installer/`, `config.json`, …) in the OS file manager. */
    openAppFolder: (id: string) => Promise<LaunchResult>;
    /** Open the app's bonus content (`paths.bonus`) — a folder in the OS file manager, or a file with its default app. */
    openBonus: (id: string) => Promise<LaunchResult>;
    /** Bytes on disk of each game's installer, data, trailer, covers and bonus content, keyed by app id. */
    /** Measures every game not in `skipIds` (already-known results — resuming a cancelled scan skips
     * re-walking them) and resolves with just the newly-measured ones. */
    /** Total/free space of the drive the content folder is on — a single OS call, not a folder walk. */
    diskSpace: () => Promise<DiskSpace | null>;
    sizes: (skipIds?: string[]) => Promise<Record<string, AppSizes>>;
    /** Aborts an in-progress `sizes()` scan (e.g. the health tab was left before it finished). */
    cancelSizes: () => void;
    /** Fires once per game as `sizes()` measures it, so a table can fill in live instead of waiting
     * for the whole scan to finish. */
    onSizesProgress: (callback: (event: { id: string; sizes: AppSizes }) => void) => () => void;
    /** The folder name a game title would get (invalid characters removed), or `null` if nothing usable is left. */
    folderName: (title: string) => Promise<string | null>;
    /** Force-quit a running game (and the processes it started). */
    stop: (id: string) => Promise<LaunchResult>;
    /** Ids of the games that are running right now. */
    running: () => Promise<string[]>;
    /** Subscribe to game start/exit events; returns an unsubscribe function. */
    onRunningChanged: (callback: (event: RunningEvent) => void) => () => void;
    backupList: (id: string) => Promise<BackupResult>;
    /** Zips the game's saves into `<game>/backups/`. */
    backupCreate: (id: string) => Promise<BackupResult>;
    /** Unpacks a backup over the saves (after saving the current ones as a `before-restore` backup). */
    backupRestore: (id: string, name: string) => Promise<BackupResult>;
    backupDelete: (id: string, name: string) => Promise<BackupResult>;
    /** Open the game's `backups/` folder in the OS file manager. */
    backupOpen: (id: string) => Promise<LaunchResult>;
    /** Create `<content>/<folder from title>/` with `data`, `assets`, `installer`, `bonus` and a `config.json`; fails if the folder already exists. */
    createApp: (title: string, config: RawAppConfig) => Promise<CreateAppResult>;
    /** Download covers, screenshots and trailer of a Steam app into the game's folder; `null` if the request was invalid. */
    downloadSteamAssets: (id: string, steamAppId: string, options?: DownloadSteamAssetsOptions) => Promise<SteamAssetsResult | null>;
    /** Read the app's raw `config.json` for editing. */
    readConfig: (id: string) => Promise<ConfigResult>;
    /** Overwrite the app's `config.json` with the given object. */
    writeConfig: (id: string, config: RawAppConfig) => Promise<LaunchResult>;
    /** Open a native file ('file', default) or folder ('folder') picker for one `paths.*` field; resolves to a path relative to the app's folder. */
    pickPath: (id: string, field: PathField, mode?: 'file' | 'folder') => Promise<PickPathResult>;
    /** Launch one of the app's custom buttons (`config.json`'s `customButtons[index]`) — a file gets executed, a folder opens in the OS file manager. */
    openCustomButton: (id: string, index: number) => Promise<LaunchResult>;
  };
  capture: CaptureAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
