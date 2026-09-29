🇬🇧 English | [🇷🇺 Русский](README.ru.md)

# React Launcher

A Windows desktop launcher (Electron + React + TypeScript) — a single home for
your personal game collection: old titles, hand-ported copies, games bought on
different storefronts, or anything just scattered across folders. Drop a game
into its own folder and the launcher pulls in the cover, trailer and
description, then launches it with one button.

## Why this exists

Over time every gamer ends up with a collection that doesn't fit into any
single store client: old discs, portable copies, indie games without Steam,
titles from several storefronts at once. None of it has a shared library,
stats, or a single way to launch — you end up remembering where everything
lives and keeping a dozen shortcuts on the desktop.

React Launcher solves exactly that:

- **One library instead of a pile of folders and shortcuts** — any game
  dropped into `content/` shows up in the shared gallery with a cover,
  description and a "Play" button.
- **No manual metadata wrangling** — the add-game wizard looks the game up on
  Steam and fills in covers, screenshots, the trailer, description and facts
  by itself.
- **See what's missing and how much space it takes** — the library health
  check flags games without a cover/description and shows how much disk
  space each game uses (and how much free space is left overall).
- **Play stats and motivation** — profiles, playtime, levels/XP and
  achievements, so going back to old games is more fun.
- **One interface for the whole family** — several local encrypted profiles
  on the same computer, each with its own progress and favorites.

## Features

- **Game library** — folders under `content/` turn into cards with a cover,
  trailer, description, genre/series and rating; search, filters, grouping.
- **Add-game wizard** with Steam search: auto-fills the name, genre, rating,
  description and facts, and downloads covers/screenshots/trailer — no manual
  `config.json` editing.
- **Library health check** — a table of games missing a cover/trailer/
  description with bulk re-fetch from Steam; per-game disk usage breakdown
  (installer / data / trailer / covers) plus a whole-drive summary.
- **Profiles** — several local profiles on one PC; each profile's data
  (stats, favorites, theme, achievements, screenshots) is encrypted
  (AES-256-GCM) and unreadable outside the app.
- **Gamification** — levels and XP, 160+ achievements (bronze / silver
  / gold for play habits, plus one-off secrets) — computed only from real
  activity, so editing a file can't fake it.
- **Screenshot and gameplay recording** — `Ctrl+Shift+F9` for a screenshot,
  `Ctrl+Shift+F10` for up to 20 seconds of recording, right while the game is
  running; a gallery on each game's page.
- **Save backups** — one-click backup and restore of save files, with the
  current state auto-archived before a restore.
- **Themes** — dark/light plus a set of ready-made presets, and your own
  theme editor.
- **Gamepad and fullscreen support** out of the box — full mouse/keyboard-free
  navigation.
- **"Feeling Lucky"** — a spinning reel that randomly picks a game from your
  library.
- **Favorites**, install/compatibility instructions on a game's page, a
  button for the game's own external settings tool, and custom launch
  arguments.
- **Russian and English** UI.

## Out of the box: quick start

There are no prebuilt installer/portable `.exe` files in the repository yet —
the app is built from source. This takes about five minutes.

1. **Requirements**: Windows, [Node.js](https://nodejs.org/) 16 or newer, npm.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Profile encryption key** — a required step; without it the app won't
   start (no `PROFILE_ENCRYPTION_KEY` → the main process exits immediately):
   ```bash
   cp .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Paste the resulting string into `.env` as the value of
   `PROFILE_ENCRYPTION_KEY`. Don't change the key once generated — otherwise
   existing profiles stop being readable.
4. **Run it**:
   ```bash
   npm start
   ```
   This starts the React dev server and the Electron window together. On the
   first run there are no profiles yet — the app asks you to create one
   (just a name, no password).
5. **Add your first game** — on the home screen, the add-game button opens a
   wizard: type the name, optionally search Steam to auto-fill covers/
   description, then point it at the game's files and its `.exe`.
   Alternatively, lay the game out under `content/` by hand — see
   [Content library](#content-library) below.
6. To build an actual `.exe` (portable and an NSIS installer), run `npm run
   build:exe` — see [Build](#build) below.

## Setup

### Requirements
- Node.js 16 or newer
- npm

### Install

```bash
npm install
```

### Development

```bash
npm start
```

Starts the React dev server and the Electron app together.

### Build

Build a standalone executable:

```bash
npm run build:exe
```

Output goes into `dist/`: `React Launcher Setup <version>.exe` (NSIS
installer) and `React Launcher <version>.exe` (portable). `dist/win-unpacked/`
is an intermediate folder, not meant for distribution.

## Path alias

`@` points at `src/`, so `import { X } from '@/widgets/X'` works from
anywhere. [CRACO](https://craco.js.org/) (`craco.config.js`) runs the
renderer build — it adds the alias for webpack and jest, while
`tsconfig.paths.json` (pulled into `tsconfig.json` via `extends`) mirrors it
for TypeScript. `paths` lives in its own file so `react-scripts` doesn't
strip it on every run/build. The same `craco.config.js` is also the single
source of truth for app/build identity (name, version, author, project site,
repository) — it forwards those from `package.json` into
`process.env.REACT_APP_*` for the renderer, shown on the Settings → About tab
(`features/AboutSection`) next to the fixed upstream-project credit.

## Project structure

```
React Launcher/
├── electron/
│   ├── electron.ts          # Electron main process (TS source)
│   ├── content.ts           # Scans ./content, the content:// protocol, launching apps
│   ├── profiles.ts          # Profiles: index, reading/writing encrypted files
│   ├── profileCrypto.ts     # AES-256-GCM encryption of profile files
│   ├── achievements.ts      # Achievements/XP: metrics, tiers, granting
│   ├── progressIpc.ts       # IPC wrapper around a profile's progress
│   ├── capture.ts           # Screenshots/gameplay recording, overlay
│   ├── backups.ts           # Save-file backups
│   ├── steam.ts             # Steam search/metadata for the add-game wizard
│   └── preload.ts           # contextBridge: window.electronAPI (TS source)
├── public/
│   ├── electron.js          # Generated by `npm run build:electron` (gitignored)
│   ├── content.js           # Generated by `npm run build:electron` (gitignored)
│   ├── preload.js           # Generated by `npm run build:electron` (gitignored)
│   └── index.html           # HTML template
├── src/
│   ├── app/
│   │   ├── assets/css/
│   │   │   └── global.css   # Theme tokens + global styles (normalization: modern-normalize)
│   │   ├── hooks/            # useFullscreenState, useGamepadNavigation, useProgressSync, …
│   │   ├── i18n/             # ru/en lexemes (messages.ts) + useTranslation()
│   │   ├── lib/               # App-list grouping, gamepad-focus geometry, library health check
│   │   └── store/             # Zustand stores: theme, language, content, favorites, profile, …
│   ├── features/
│   │   ├── AddGame/           # Add-game wizard (Steam auto-fill)
│   │   ├── ProfileManager/    # Create/switch/delete profiles
│   │   ├── LibraryHealth/     # Library health check + disk usage analysis
│   │   ├── ThemePicker/       # Theme presets + custom theme editor
│   │   └── …                  # AboutSection, CardsSettings, LanguageToggle, …
│   ├── shared/                # Modal, FormField, RatingBadge, Tabs, charts, etc. — small shared components
│   ├── pages/
│   │   ├── GalleryPage/       # route "/" — Gallery / Recently played (tabs, not routes)
│   │   ├── FavoritesPage/     # route "/favorites" — favorites only
│   │   ├── AchievementsPage/  # route "/achievements" — level, achievements, stats
│   │   ├── PreviewPage/       # route "/app/:id" — cover header, play / favorite / gear menu
│   │   ├── ProfileSetupPage/  # first-profile creation screen (no route of its own)
│   │   └── SettingsPage/      # route "/settings"
│   ├── widgets/
│   │   ├── AppNavigation/     # Sidebar with icons (router links + quit)
│   │   ├── TitleBar/          # Top bar in windowed mode (drag + minimize/maximize/close)
│   │   ├── CaptureManager/    # Records gameplay (MediaRecorder) on the main process's command
│   │   ├── GamepadNavigation/ # Mounts gamepad navigation over `data-gamepad-focusable`, renders null
│   │   └── …                  # HomeTabs, AppCollection, GalleryControls, AppGrid, AchievementToasts, …
│   ├── App.tsx              # HashRouter + layout
│   ├── App.css
│   ├── index.tsx            # React entry point
│   ├── electron.d.ts        # Types for window.electronAPI
│   └── react-app-env.d.ts
├── craco.config.js          # CRA override: `@` -> `src` alias (webpack + jest), REACT_APP_* from package.json
├── tsconfig.json            # TS config for the renderer (CRA)
├── tsconfig.paths.json      # `@/*` mapping, pulled into tsconfig.json
├── tsconfig.electron.json   # TS config for the Electron main process + preload
├── package.json
└── .gitignore
```

The main process and preload live in `electron/*.ts` and compile to
`public/*.js` (CRA then copies them into `build/`). Run `npm run
build:electron` after editing them; `npm run electron-dev` and `npm run
build:exe` do this for you. `npm run typecheck` checks both the renderer's
and Electron's types without emitting output.

## Window

The app opens **fullscreen, frameless** (`fullscreen: true`, `frame: false`),
with no application menu and no OS window buttons. The sidebar has a
fullscreen/windowed toggle (`window:toggle-fullscreen`; the state arrives via
a `window:fullscreen-changed` event, debounced in the main process — on
Windows, `enter/leave-full-screen` can fire more than once in a row while the
transition animates) and a quit button (`window.electronAPI.quit()` /
`app:quit`).

In windowed mode a **`TitleBar`** appears on top — a title-less strip: the
empty area drags the window (`-webkit-app-region: drag`), and the right side
has minimize / maximize-restore / close (`window:minimize`,
`window:toggle-maximize` + a `window:maximized-changed` event, `window:close`).
The sidebar doesn't participate in dragging.

## Routing

`HashRouter` (required for a `file://` build). While no profile exists yet,
`ProfileSetupPage` is shown instead of the whole UI (creating the first
profile, with no route of its own). After that, the routes are: `/` →
`GalleryPage`, `/favorites` → `FavoritesPage`, `/achievements` →
`AchievementsPage`, `/app/:id` → `PreviewPage`, `/settings` → `SettingsPage`.
The sidebar uses `NavLink`, and the active route's icon is highlighted via
the `.active` class. The **Favorites** icon only shows up once at least one
app is favorited (`favoritesStore`).

"Gallery" and "Recently played" aren't separate routes but tabs inside
`GalleryPage` (local state, switched by `widgets/HomeTabs`): they originally
lived on separate URLs (`/` and `/recent`), but then the sidebar's "Home"
icon (highlighted via `NavLink end`) only lit up for `/` and went dark on
`/recent` — they were turned into tabs specifically to avoid that mismatch.
"Feeling Lucky" follows the same pattern — a tab on the home screen, not a
separate route.

## Styles and themes

`src/index.tsx` imports
[`modern-normalize`](https://github.com/sindresorhus/modern-normalize) for
cross-browser normalization, then `src/app/assets/css/global.css`.

`global.css` defines the palette as CSS variables: bare `:root` is the
**dark** theme (the default), and `:root[data-theme="light"]` overrides it.
Every component (`App.css`, `AppNavigation.css`, …) only uses
`var(--color-*)` tokens, so all themes stay consistent. Besides dark/light
there's a set of ready-made presets and a custom theme editor
(`features/ThemePicker`).

The active theme lives in a **Zustand** store (`src/app/store/themeStore.ts`)
with the `persist` middleware, which writes to `localStorage`. Electron keeps
`localStorage` in the user-data directory, so the choice survives an exe
restart. The store also mirrors its value onto `<html data-theme>`, and
`src/index.tsx` imports it before the first render — there's no theme flash.
Switched on the settings page.

## Localization (i18n)

Interface strings are lexemes in `src/app/i18n/messages.ts` (`ru` is the
source of truth for the key set; `en` is typed as
`Record<MessageKey, string>`, so a missing key is a type error).
`useTranslation()` returns `t('nav.home')` for the current language; an
unknown key is returned as-is — which lets keys coming from `config.json`
work too. The language is a persisted Zustand store
(`src/app/store/localeStore.ts`, defaulting to **ru**), mirrored onto
`<html lang>`; switched on the settings page. Localizable text in
`config.json` (`description`, `instructions`, `facts[].label`/
`facts[].value`) follows the selected language too.

## Content library

On launch the app scans the **content directory** — `dist/content/` in dev
mode; in a packaged app, a `content` folder next to the exe (next to the
portable exe for a portable build, `../content` for an unpacked build).
Overridable with the `REACT_LAUNCHER_CONTENT_DIR` environment variable. Each
subfolder is a separate app, named after its folder:

```
content/
└── Graveyard Keeper/
    ├── config.json     # optional, see below — usually not needed: the add-game wizard writes it for you
    ├── data/           # the app's files (including the .exe)
    ├── installer/      # optional — an installer folder
    ├── screenshots/    # optional — screenshots (gallery on the game's page)
    ├── backups/        # created automatically — save-file backups
    └── assets/
        ├── cover_horizontal.jpg  # horizontal cover (the app page's header)
        ├── cover_vertical.jpg    # vertical cover (the grid)
        └── trailer.mp4           # optional trailer (player on the game's page)
```

The easiest way to add a game is through the in-app wizard (the add-game
button on the home screen) — it creates this structure itself and, if it
finds the game on Steam, fills in `config.json` for you. Manual editing below
is for fine-tuning, or for games Steam doesn't have.

`config.json` (every key is optional — the layout above is the default when
omitted). Edited either by hand or right in the app — see **Editing
config.json** below:

```json
{
  "name": "Graveyard Keeper",
  "genre": "genre.simulation",
  "coverHorizontalPosition": "top",
  "paths": {
    "exec": "data/Graveyard Keeper.exe",
    "settings": "data/Setup.exe",
    "coverHorizontal": "assets/cover_horizontal.jpg",
    "coverVertical": "assets/cover_vertical.jpg"
  },
  "description": { "ru": "…", "en": "…" },
  "instructions": { "ru": "…", "en": "…" },
  "rating": 6.9,
  "facts": [
    { "label": { "ru": "Год выхода", "en": "Release year" }, "value": "2018" },
    { "label": { "ru": "Жанр", "en": "Genre" }, "value": { "ru": "…", "en": "…" } }
  ],
  "previewNotes": {
    "text": { "ru": "…", "en": "…" },
    "type": "warning"
  }
}
```

`genre` and `series` are optional, used for grouping/filtering on the home
screen (`GalleryPage`). `genre` is a **lexeme key** of the form
`genre.<name>` from `messages.ts` (currently defined: `genre.action`,
`genre.adventure`, `genre.rpg`, `genre.simulation`, `genre.strategy`,
`genre.shooter`, `genre.horror`, `genre.puzzle`, `genre.platformer`,
`genre.racing`, `genre.sports`, `genre.fighting`, `genre.survival`,
`genre.sandbox`, `genre.arcade`, `genre.indie`, `genre.casual`, `genre.app`;
new categories go there too). `genre.app` isn't a genre in the usual sense —
it marks "this is a utility, not a game": it changes the launch button's
label to "Launch" instead of "Play" (`PreviewPage`, comparing
`app.genre === 'genre.app'`).
`series` is a plain string (a franchise name isn't translated), shown as-is;
games without a `series` (standalone projects, for example) simply omit the
field — on the home screen they land in an "Other" group under the "By
series" view.

Every on-disk path (`exec`, `settings`, covers) is grouped under `paths` and
given relative to the app's folder; missing keys fall back to the defaults
above (`data/<folder name>.exe`, `assets/cover_horizontal.jpg`,
`assets/cover_vertical.jpg`) — `settings` has no default, since it's an
optional external settings tool (a launcher/graphics configurator etc.) that
some games ship as a separate exe.

Additional optional `config.json` fields:

```json
{
  "launch": { "args": "-windowed -nointro" },
  "paths": {
    "screenshots": "screenshots",
    "trailer": "assets/trailer.mp4",
    "saves": "%DOCUMENTS%/My Games/Fallout4/Saves"
  }
}
```

- `launch.args` — command-line arguments; set from the "Edit data" form.
- `paths.screenshots` (default `screenshots/`) and `paths.trailer` (default
  `assets/trailer.mp4`) — media on the game's page; video is served over
  `content://` with Range support, so seeking works.
- `paths.saves` — the save folder (or file) to back up. Can be an absolute
  path, a path relative to the game's folder (`data/saves`), or use
  `%DOCUMENTS%`, `%APPDATA%`, `%LOCALAPPDATA%`, `%USERPROFILE%` — so the
  config carries over between computers. When set, a "Save backups" item
  appears in the game's gear menu: zip copies live in `<game>/backups/`, and
  the current saves are automatically archived as `before-restore_*.zip`
  before a restore.

While a game is running (tracked by the main process), "Play" is replaced by
"Stop" (`taskkill /T`), and the session length is added to "Playtime" — both
that and "last played" are stored in the profile and available for sorting
the gallery, stats and achievements. If the `exe` is a launcher that starts
the game and exits right away, time is counted against the launcher instead.

`coverHorizontalPosition` is optional and sets the `object-position` for the
header cover on the app page (`PreviewPage`): `"top"`, `"center"` (default)
or `"bottom"`. Needed when a wide cover gets cropped to fit the 16:6
container and the center of the frame crops out an important part of the
image (a character's head, say) — this lets it be pinned to the right edge
instead of being cropped evenly on both sides. Any other value is read as
`"center"`.

Any localizable text (`description`, `facts[].value`, `facts[].label`,
`instructions`) can be a plain string (not tied to a language) or
`{ ru, en }`; the app page takes the current language, then `en`, then `ru`.
`facts[].label` is localizable text just like `value` (e.g.
`{ "ru": "Разработчик", "en": "Developer" }`), not a lexeme key — facts can
be given arbitrary names, not limited to the presets in `messages.ts`.
If `paths.settings` is set, a separate **Game settings** button appears next
to "Play", launching that external tool. Separate from it, the gear icon
(`Settings`) holds actions for the app's install/data (see below).

`instructions` is optional localizable text (install/compatibility
instructions — patches, DPI scaling, changing the language, etc.). If present
(for the current language, `en`, or `ru`), an **Instructions** button appears
next to "Play"/"Game settings", opening it in a popup (with the original
text's line breaks preserved, monospace).

`previewNotes` is optional and shows a message (`shared/Message`) under the
button row on the app page (a compatibility warning or an install note, for
example). `text` is localizable text (the same `ru`/`en`/plain-string logic
as `description`); an empty/missing text means no message is shown. `type` is
optional, one of `"info"` (default), `"success"`, `"warning"`, `"error"` —
it drives the icon and color; an unknown value is read as `"info"`.

`rating` is a number from 0–10 (a Metacritic score divided by 10, for
example), rounded to one decimal and clamped to range. Shown as a star badge
on the grid card and on the app page next to the name. The home screen's list
is sorted by `rating` descending, with unrated apps last, ties broken by
name.

The filterable/groupable grid — `widgets/AppCollection` — is a shared widget
used by every app list (Gallery, Favorites, Recently played), so the
behavior is the same everywhere:
- A view switcher (`widgets/GalleryControls`) on top: **All** (a flat grid,
  filtered by genre and series via `<select>`), **By genre** and **By
  series** (group the grid into sections; each view hides the filter for its
  own axis — grouping already sets it, while the filter for the other axis
  stays available). Games without a `series` land in an **Other** group
  under the "By series" view.
- While at least one filter is active, a **"Clear filters"** button appears
  next to it, clearing both at once.

### Editing config.json

Instead of hand-editing `config.json` on disk, it can be changed right in the
app: the **Edit data** item in the game page's gear menu opens a form with
every field the content library understands (name, genre, series, rating,
header-cover position, every `paths.*` path, `description`/`instructions`/
the on-page note in both languages, the `facts` list).

- Every path (`exec`, `settings`, `installer`, covers, the extra-content
  folder) has a folder-icon button that opens a native Windows file/folder
  picker and fills in a path relative to the app's folder; for covers the
  dialog filters by images, for `exec`/`settings`/`installer` by `.exe`, and
  for extra content it asks for a folder.
- Facts (`facts`) are edited row by row: each row has a name in ru/en and a
  value in ru/en, and rows can be added or removed.
- **Save** rewrites `config.json` entirely (only non-empty fields — the same
  way it's usually written by hand) and refreshes the app list, so edits show
  up on the page right away.

## License

[MIT](./LICENSE) © Alexander Anikin — [walkerz.ru](https://walkerz.ru)
