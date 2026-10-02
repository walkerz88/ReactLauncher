import type { ContentApp, LocalizedText } from '@/electron';

export type HealthIssueKey =
  | 'noCoverHorizontal'
  | 'noCoverVertical'
  | 'noTrailer'
  | 'noScreenshots'
  | 'noDescription'
  | 'descriptionIncomplete'
  | 'noFacts'
  | 'noGenre'
  | 'noRating'
  | 'descriptionLangSwapped'
  | 'instructionsIncomplete'
  | 'instructionsLangSwapped'
  | 'notesIncomplete'
  | 'notesLangSwapped';

/** Serious enough to flag right on the gallery card — the rest are fine left for the health list. */
const CRITICAL_ISSUES: readonly HealthIssueKey[] = ['noCoverHorizontal', 'noCoverVertical'];

/** Below this many letters, a script-mix check is unreliable (e.g. a title made of just a couple of
 * Latin brand-name words inside an otherwise-Russian sentence) — skip rather than guess. */
const MIN_LETTERS_FOR_LANG_CHECK = 8;

const countMatches = (text: string, pattern: RegExp): number => (text.match(pattern)?.length ?? 0);

/** True if `text` reads as the *other* language than `expected` — the dominant script is the wrong
 * one, not just a stray foreign word (a brand name, an acronym, …) mixed into otherwise-right text. */
const looksLikeWrongLanguage = (text: string, expected: 'ru' | 'en'): boolean => {
  const cyrillic = countMatches(text, /[а-яё]/gi);
  const latin = countMatches(text, /[a-z]/gi);

  if (cyrillic + latin < MIN_LETTERS_FOR_LANG_CHECK) {
    return false;
  }

  return expected === 'ru' ? latin > cyrillic : cyrillic > latin;
};

const hasLangMismatch = (text: LocalizedText): boolean =>
  (text.ru != null && looksLikeWrongLanguage(text.ru, 'ru')) ||
  (text.en != null && looksLikeWrongLanguage(text.en, 'en'));

/** Written in only one of the two languages. */
const isIncomplete = (text: LocalizedText): boolean => !text.ru || !text.en;

/** What's missing for `app`, in a fixed order — used for the gallery warning badge and the library health
 * report. Horizontal and vertical covers are checked separately (a game can have just one of the two), so
 * the bulk fill can re-fetch only the piece that's actually missing. Mirrors every field the "Дозаполнить"
 * popup can refetch, plus checks that the description's and instructions' Russian and English texts both
 * exist and aren't actually swapped. Instructions are optional — only a half-translated one is a problem.
 * Not checking `hasExec`: plenty of entries (utilities, installer-only tools) are never meant to be launched
 * directly, so a missing executable isn't actually a problem for them. */
export const getHealthIssues = (app: ContentApp): HealthIssueKey[] => {
  const issues: HealthIssueKey[] = [];

  if (!app.coverHorizontal) {
    issues.push('noCoverHorizontal');
  }

  if (!app.coverVertical) {
    issues.push('noCoverVertical');
  }

  if (!app.trailer) {
    issues.push('noTrailer');
  }

  if (app.screenshots.length === 0) {
    issues.push('noScreenshots');
  }

  if (!app.description) {
    issues.push('noDescription');
  } else if (isIncomplete(app.description)) {
    issues.push('descriptionIncomplete');
  } else if (hasLangMismatch(app.description)) {
    issues.push('descriptionLangSwapped');
  }

  if (app.instructions && isIncomplete(app.instructions)) {
    issues.push('instructionsIncomplete');
  } else if (app.instructions && hasLangMismatch(app.instructions)) {
    issues.push('instructionsLangSwapped');
  }

  if (app.previewNotes.some((note) => isIncomplete(note.text))) {
    issues.push('notesIncomplete');
  } else if (app.previewNotes.some((note) => hasLangMismatch(note.text))) {
    issues.push('notesLangSwapped');
  }

  if (app.facts.length === 0) {
    issues.push('noFacts');
  }

  if (!app.genre) {
    issues.push('noGenre');
  }

  if (app.rating == null) {
    issues.push('noRating');
  }

  return issues;
};

export const hasCriticalHealthIssue = (app: ContentApp): boolean =>
  getHealthIssues(app).some((issue) => CRITICAL_ISSUES.includes(issue));

export type FieldStatus = 'ok' | 'missing' | 'warning' | 'none';

interface HealthFieldColumn {
  labelKey: string;
  /** Issues shown in this column, most serious first, with the status each one puts the cell in. */
  checks: ReadonlyArray<[HealthIssueKey, FieldStatus]>;
  /** Optional fields only: nothing filled in at all isn't a problem, just shown as "none". */
  isEmpty?: (app: ContentApp) => boolean;
}

/** One column per field the "Дозаполнить" popup can refetch (plus the optional instructions) — the health
 * table shows, per game, whether each is filled in, not just a combined list of problems. */
export const HEALTH_FIELD_COLUMNS: readonly HealthFieldColumn[] = [
  { labelKey: 'health.column.coverHorizontal', checks: [['noCoverHorizontal', 'missing']] },
  { labelKey: 'health.column.coverVertical', checks: [['noCoverVertical', 'missing']] },
  { labelKey: 'health.column.trailer', checks: [['noTrailer', 'missing']] },
  { labelKey: 'health.column.screenshots', checks: [['noScreenshots', 'missing']] },
  {
    labelKey: 'health.column.description',
    checks: [
      ['noDescription', 'missing'],
      ['descriptionIncomplete', 'missing'],
      ['descriptionLangSwapped', 'warning'],
    ],
  },
  {
    labelKey: 'health.column.instructions',
    checks: [
      ['instructionsIncomplete', 'warning'],
      ['instructionsLangSwapped', 'warning'],
    ],
    isEmpty: (app) => !app.instructions,
  },
  {
    labelKey: 'health.column.notes',
    checks: [
      ['notesIncomplete', 'warning'],
      ['notesLangSwapped', 'warning'],
    ],
    isEmpty: (app) => app.previewNotes.length === 0,
  },
  { labelKey: 'health.column.facts', checks: [['noFacts', 'missing']] },
  { labelKey: 'health.column.genre', checks: [['noGenre', 'missing']] },
  { labelKey: 'health.column.rating', checks: [['noRating', 'missing']] },
];

/** The cell's status plus the issue behind it (`null` when fine or empty) — for its icon and tooltip. */
export const getFieldStatus = (
  app: ContentApp,
  issues: readonly HealthIssueKey[],
  column: HealthFieldColumn,
): { status: FieldStatus; issue: HealthIssueKey | null } => {
  const check = column.checks.find(([issue]) => issues.includes(issue));

  if (check) {
    return { status: check[1], issue: check[0] };
  }

  if (column.isEmpty?.(app)) {
    return { status: 'none', issue: null };
  }

  return { status: 'ok', issue: null };
};
