import type { LocalizedText, RawAppConfig } from '@/electron';

type RawLocalized = Partial<LocalizedText> | string | undefined;

export interface TranslateMissingResult {
  config: RawAppConfig;
  changed: boolean;
  /** At least one text needed a translation and didn't get one. */
  failed: boolean;
}

/** A bare string in `config.json` localized fields is treated as `en`. */
const splitLocalized = (value: RawLocalized): LocalizedText =>
  typeof value === 'string' ? { ru: null, en: value } : { ru: value?.ru ?? null, en: value?.en ?? null };

/** Fills in the one empty language of a localized text from the other; never touches a text that has both
 * or neither. `null` when there was nothing to do, `undefined` when the translation failed. */
const fillMissing = async (value: RawLocalized): Promise<LocalizedText | null | undefined> => {
  const { ru, en } = splitLocalized(value);
  const missing = !ru?.trim() ? 'ru' : !en?.trim() ? 'en' : null;
  const from = missing === 'ru' ? en : ru;

  if (!missing || !from?.trim()) {
    return null;
  }

  try {
    const translated = await window.electronAPI?.translate.text(from, missing);

    if (!translated?.trim()) {
      return undefined;
    }

    return { ru, en, [missing]: translated.trim() };
  } catch (err) {
    console.error('Translating missing text failed:', err);

    return undefined;
  }
};

/** Translates whichever of a game's description, instructions and page notes exist in only one language —
 * the same gaps the library health check flags — leaving everything already written untouched. */
export const fillMissingTranslations = async (source: RawAppConfig): Promise<TranslateMissingResult> => {
  const config: RawAppConfig = { ...source };
  let changed = false;
  let failed = false;

  const apply = (filled: LocalizedText | null | undefined, assign: (text: LocalizedText) => void) => {
    if (filled === undefined) {
      failed = true;
    } else if (filled) {
      assign(filled);
      changed = true;
    }
  };

  apply(await fillMissing(config.description), (text) => {
    config.description = text;
  });

  apply(await fillMissing(config.instructions), (text) => {
    config.instructions = text;
  });

  const notes = Array.isArray(config.previewNotes) ? config.previewNotes : config.previewNotes ? [config.previewNotes] : [];
  const nextNotes: NonNullable<RawAppConfig['previewNotes']> = [];

  for (const note of notes) {
    const filled = await fillMissing(note.text);

    apply(filled, () => undefined);
    nextNotes.push(filled ? { ...note, text: filled } : note);
  }

  if (notes.length > 0) {
    config.previewNotes = nextNotes;
  }

  return { config, changed, failed };
};
