import { useEffect, useState, type FC } from 'react';
import type { FormEvent } from 'react';
import { Reorder } from 'framer-motion';
import { Info, Loader2, Plus, Wand2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { GENRE_KEYS } from '@/app/lib/genres';
import { useNotificationStore } from '@/app/store/notificationStore';
import { BulkFillModal, type FillFields } from '@/shared/BulkFillModal';
import { FormField } from '@/shared/FormField';
import { Modal } from '@/shared/Modal';
import { PathField } from '@/shared/PathField';
import { SteamNoMatchModal } from '@/shared/SteamNoMatchModal';
import { SteamPickerModal } from '@/shared/SteamPickerModal';
import { Tooltip } from '@/shared/Tooltip';
import { TranslateButton } from '@/shared/TranslateButton';
import type { PathField as PathFieldName, RawAppConfig, SteamSearchResult } from '@/electron';

import { CustomButtonRow, type CustomButtonRowValue } from './components/CustomButtonRow';
import { FactRow, type FactRowValue } from './components/FactRow';
import { NoteRow, type NoteRowValue } from './components/NoteRow';

export interface EditConfigModalProps {
  appId: string;
  appName: string;
  onClose: () => void;
  /** Called after a successful save, so the caller can refresh the library. */
  onSaved: () => void;
}

interface FormState {
  name: string;
  genre: string;
  series: string;
  rating: string;
  previewStart: string;
  coverHorizontalPosition: string;
  descriptionRu: string;
  descriptionEn: string;
  instructionsRu: string;
  instructionsEn: string;
  notes: NoteRowValue[];
  pathExec: string;
  pathSettings: string;
  pathInstaller: string;
  pathCoverHorizontal: string;
  pathCoverVertical: string;
  pathBonus: string;
  pathScreenshots: string;
  pathTrailer: string;
  pathSaves: string;
  launchArgs: string;
  facts: FactRowValue[];
  customButtons: CustomButtonRowValue[];
}

/** Path-form fields, paired with the `PathField` on `config.json`'s `paths` object they edit. */
const PATH_FIELDS: Array<{
  formKey:
    | 'pathExec'
    | 'pathSettings'
    | 'pathInstaller'
    | 'pathCoverHorizontal'
    | 'pathCoverVertical'
    | 'pathBonus'
    | 'pathScreenshots'
    | 'pathTrailer'
    | 'pathSaves';
  configField: keyof NonNullable<RawAppConfig['paths']>;
  labelKey: string;
  placeholder: string;
  /** Whether this field also gets a "browse folder" button. */
  supportsFolder?: boolean;
  /** Only ever points at a folder — hides the file-picker button, keeping just "browse folder". */
  hideFileBrowse?: boolean;
}> = [
  {
    formKey: 'pathCoverHorizontal',
    configField: 'coverHorizontal',
    labelKey: 'editConfig.pathCoverHorizontal',
    placeholder: 'assets/cover_horizontal.jpg',
  },
  {
    formKey: 'pathCoverVertical',
    configField: 'coverVertical',
    labelKey: 'editConfig.pathCoverVertical',
    placeholder: 'assets/cover_vertical.jpg',
  },
  {
    formKey: 'pathExec',
    configField: 'exec',
    labelKey: 'editConfig.pathExec',
    placeholder: 'data/game.exe',
    supportsFolder: true,
  },
  {
    formKey: 'pathSettings',
    configField: 'settings',
    labelKey: 'editConfig.pathSettings',
    placeholder: 'data/Setup.exe',
    supportsFolder: true,
  },
  {
    formKey: 'pathInstaller',
    configField: 'installer',
    labelKey: 'editConfig.pathInstaller',
    placeholder: 'installer/Setup.exe',
    supportsFolder: true,
  },
  {
    formKey: 'pathBonus',
    configField: 'bonus',
    labelKey: 'editConfig.pathBonus',
    placeholder: 'bonus',
    supportsFolder: true,
    hideFileBrowse: true,
  },
  {
    formKey: 'pathScreenshots',
    configField: 'screenshots',
    labelKey: 'editConfig.pathScreenshots',
    placeholder: 'screenshots',
    supportsFolder: true,
    hideFileBrowse: true,
  },
  {
    formKey: 'pathTrailer',
    configField: 'trailer',
    labelKey: 'editConfig.pathTrailer',
    placeholder: 'assets/trailer.mp4',
  },
  {
    formKey: 'pathSaves',
    configField: 'saves',
    labelKey: 'editConfig.pathSaves',
    placeholder: '%DOCUMENTS%/My Games/Game',
    supportsFolder: true,
    hideFileBrowse: true,
  },
];

/** A bare string in `config.json` localized fields is treated as `en`. */
function splitLocalized(value: RawAppConfig['description']): { ru: string; en: string } {
  if (typeof value === 'string') {
    return { ru: '', en: value };
  }

  return { ru: value?.ru ?? '', en: value?.en ?? '' };
}

/** Random id used only as React/`Reorder` item identity — never persisted. */
function makeRowId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `row-${Math.random().toString(36).slice(2)}`;
}

/** Accepts an array (current format) or a bare object (pre-array config on disk). */
function readNotesList(value: RawAppConfig['previewNotes']): NoteRowValue[] {
  const entries = Array.isArray(value) ? value : value ? [value] : [];

  return entries.map((entry) => {
    const text = splitLocalized(entry.text);

    return { id: makeRowId(), ru: text.ru, en: text.en, type: entry.type ?? 'info' };
  });
}

function configToForm(config: RawAppConfig): FormState {
  const description = splitLocalized(config.description);
  const instructions = splitLocalized(config.instructions);

  return {
    name: config.name ?? '',
    genre: config.genre ?? '',
    series: config.series ?? '',
    rating: config.rating != null ? String(config.rating) : '',
    previewStart: config.previewStart != null ? String(config.previewStart) : '',
    coverHorizontalPosition: config.coverHorizontalPosition ?? 'center',
    descriptionRu: description.ru,
    descriptionEn: description.en,
    instructionsRu: instructions.ru,
    instructionsEn: instructions.en,
    notes: readNotesList(config.previewNotes),
    pathExec: config.paths?.exec ?? '',
    pathSettings: config.paths?.settings ?? '',
    pathInstaller: config.paths?.installer ?? '',
    pathCoverHorizontal: config.paths?.coverHorizontal ?? '',
    pathCoverVertical: config.paths?.coverVertical ?? '',
    pathBonus: config.paths?.bonus ?? '',
    pathScreenshots: config.paths?.screenshots ?? '',
    pathTrailer: config.paths?.trailer ?? '',
    pathSaves: config.paths?.saves ?? '',
    launchArgs: config.launch?.args ?? '',
    facts: (config.facts ?? []).map((fact) => {
      const label = splitLocalized(fact.label);
      const value = splitLocalized(fact.value);

      return { id: makeRowId(), labelRu: label.ru, labelEn: label.en, valueRu: value.ru, valueEn: value.en };
    }),
    customButtons: (config.customButtons ?? []).map((button) => {
      const label = splitLocalized(button.label);

      return { id: makeRowId(), labelRu: label.ru, labelEn: label.en, path: button.path ?? '' };
    }),
  };
}

function formToConfig(form: FormState): RawAppConfig {
  const config: RawAppConfig = {};

  if (form.name.trim()) {
    config.name = form.name.trim();
  }
  if (form.genre) {
    config.genre = form.genre;
  }
  if (form.series.trim()) {
    config.series = form.series.trim();
  }

  const rating = Number.parseFloat(form.rating);
  if (form.rating.trim() && Number.isFinite(rating)) {
    config.rating = Math.round(Math.min(10, Math.max(0, rating)) * 10) / 10;
  }

  const previewStart = Number.parseFloat(form.previewStart);
  if (form.previewStart.trim() && Number.isFinite(previewStart)) {
    config.previewStart = Math.round(Math.min(100, Math.max(0, previewStart)));
  }

  if (form.coverHorizontalPosition && form.coverHorizontalPosition !== 'center') {
    config.coverHorizontalPosition = form.coverHorizontalPosition;
  }

  const descriptionRu = form.descriptionRu.trim();
  const descriptionEn = form.descriptionEn.trim();
  if (descriptionRu || descriptionEn) {
    config.description = { ru: descriptionRu || null, en: descriptionEn || null };
  }

  const instructionsRu = form.instructionsRu.trim();
  const instructionsEn = form.instructionsEn.trim();
  if (instructionsRu || instructionsEn) {
    config.instructions = { ru: instructionsRu || null, en: instructionsEn || null };
  }

  const notes = form.notes
    .filter((note) => note.ru.trim() || note.en.trim())
    .map((note) => ({ text: { ru: note.ru.trim() || null, en: note.en.trim() || null }, type: note.type }));
  if (notes.length > 0) {
    config.previewNotes = notes;
  }

  const paths: NonNullable<RawAppConfig['paths']> = {};
  for (const { formKey, configField } of PATH_FIELDS) {
    const value = form[formKey].trim();
    if (value) {
      paths[configField] = value;
    }
  }
  if (Object.keys(paths).length > 0) {
    config.paths = paths;
  }

  const launch: NonNullable<RawAppConfig['launch']> = {};
  if (form.launchArgs.trim()) {
    launch.args = form.launchArgs.trim();
  }
  if (Object.keys(launch).length > 0) {
    config.launch = launch;
  }

  const facts = form.facts
    .filter((fact) => fact.labelRu.trim() || fact.labelEn.trim())
    .map((fact) => ({
      label: { ru: fact.labelRu.trim() || null, en: fact.labelEn.trim() || null },
      value: { ru: fact.valueRu.trim() || null, en: fact.valueEn.trim() || null },
    }));
  if (facts.length > 0) {
    config.facts = facts;
  }

  const customButtons = form.customButtons
    .filter((button) => (button.labelRu.trim() || button.labelEn.trim()) && button.path.trim())
    .map((button) => ({
      label: { ru: button.labelRu.trim() || null, en: button.labelEn.trim() || null },
      path: button.path.trim(),
    }));
  if (customButtons.length > 0) {
    config.customButtons = customButtons;
  }

  return config;
}

/** Full editor for `config.json` — every field the app page can display. */
export const EditConfigModal: FC<EditConfigModalProps> = ({ appId, appName, onClose, onSaved }) => {
  const t = useTranslation();
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [steamPicker, setSteamPicker] = useState<{ results: SteamSearchResult[]; fields: FillFields } | null>(null);
  const [steamNoMatch, setSteamNoMatch] = useState<{ name: string; fields: FillFields } | null>(null);

  // Mount-only fetch — `appId` is the only thing that should restart it.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await window.electronAPI?.content?.readConfig(appId);
        if (cancelled || !result) {
          return;
        }
        if (result.ok) {
          setForm(configToForm(result.config ?? {}));
        } else {
          setLoadError(result.error ?? t('editConfig.loadFailed'));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : t('editConfig.loadFailed'));
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const browsePath = async (
    field: PathFieldName,
    formKey: (typeof PATH_FIELDS)[number]['formKey'],
    mode?: 'file' | 'folder',
  ) => {
    try {
      const result = await window.electronAPI?.content?.pickPath(appId, field, mode);
      if (result?.ok && result.path) {
        update(formKey, result.path);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateFact = (id: string, patch: Partial<FactRowValue>) => {
    setForm((prev) => {
      if (!prev) {
        return prev;
      }
      const facts = prev.facts.map((fact) => (fact.id === id ? { ...fact, ...patch } : fact));

      return { ...prev, facts };
    });
  };

  const removeFact = (id: string) => {
    setForm((prev) => (prev ? { ...prev, facts: prev.facts.filter((fact) => fact.id !== id) } : prev));
  };

  const addFact = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            facts: [...prev.facts, { id: makeRowId(), labelRu: '', labelEn: '', valueRu: '', valueEn: '' }],
          }
        : prev,
    );
  };

  const reorderFacts = (facts: FactRowValue[]) => {
    setForm((prev) => (prev ? { ...prev, facts } : prev));
  };

  const updateCustomButton = (id: string, patch: Partial<CustomButtonRowValue>) => {
    setForm((prev) => {
      if (!prev) {
        return prev;
      }
      const customButtons = prev.customButtons.map((button) => (button.id === id ? { ...button, ...patch } : button));

      return { ...prev, customButtons };
    });
  };

  const removeCustomButton = (id: string) => {
    setForm((prev) => (prev ? { ...prev, customButtons: prev.customButtons.filter((button) => button.id !== id) } : prev));
  };

  const addCustomButton = () => {
    setForm((prev) =>
      prev
        ? { ...prev, customButtons: [...prev.customButtons, { id: makeRowId(), labelRu: '', labelEn: '', path: '' }] }
        : prev,
    );
  };

  const reorderCustomButtons = (customButtons: CustomButtonRowValue[]) => {
    setForm((prev) => (prev ? { ...prev, customButtons } : prev));
  };

  const browseCustomButtonPath = async (id: string, mode: 'file' | 'folder') => {
    try {
      const result = await window.electronAPI?.content?.pickPath(appId, 'customButton', mode);
      if (result?.ok && result.path) {
        updateCustomButton(id, { path: result.path });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateNote = (id: string, patch: Partial<NoteRowValue>) => {
    setForm((prev) => {
      if (!prev) {
        return prev;
      }
      const notes = prev.notes.map((note) => (note.id === id ? { ...note, ...patch } : note));

      return { ...prev, notes };
    });
  };

  const removeNote = (id: string) => {
    setForm((prev) => (prev ? { ...prev, notes: prev.notes.filter((note) => note.id !== id) } : prev));
  };

  const addNote = () => {
    setForm((prev) =>
      prev ? { ...prev, notes: [...prev.notes, { id: makeRowId(), ru: '', en: '', type: 'info' }] } : prev,
    );
  };

  const reorderNotes = (notes: NoteRowValue[]) => {
    setForm((prev) => (prev ? { ...prev, notes } : prev));
  };

  /** Downloads/fills whichever fields the popup left checked from a specific Steam app id — shared by
   * the confident-match path and the "pick from search results" path below. Resolves to whether it
   * actually applied anything, so the caller only shows a success notification when it did. */
  const applySteamMatch = async (matchId: string, fields: FillFields): Promise<boolean> => {
    const steamApi = window.electronAPI?.steam;
    const contentApi = window.electronAPI?.content;
    if (!steamApi || !contentApi) {
      return false;
    }

    const wantsAssets = fields.coverHorizontal || fields.coverVertical || fields.trailer || fields.screenshots;
    const wantsText = fields.description || fields.facts || fields.genre || fields.rating;

    if (wantsAssets) {
      await contentApi.downloadSteamAssets(appId, matchId, {
        horizontal: fields.coverHorizontal,
        vertical: fields.coverVertical,
        trailer: fields.trailer,
        screenshots: fields.screenshots,
      });
    }

    if (wantsText) {
      const info = await steamApi.info(matchId);

      if (!info) {
        useNotificationStore.getState().pushNotification(t('editConfig.autoFillNoMatch'), 'error');

        return false;
      }

      setForm((prev) =>
        prev
          ? {
              ...prev,
              descriptionRu: fields.description ? info.description.ru ?? prev.descriptionRu : prev.descriptionRu,
              descriptionEn: fields.description ? info.description.en ?? prev.descriptionEn : prev.descriptionEn,
              genre: fields.genre ? info.genre ?? prev.genre : prev.genre,
              rating: fields.rating && info.rating != null ? String(info.rating) : prev.rating,
              facts:
                fields.facts && info.facts.length > 0
                  ? info.facts.map((fact) => ({
                      id: makeRowId(),
                      labelRu: fact.label.ru,
                      labelEn: fact.label.en,
                      valueRu: fact.value,
                      valueEn: fact.value,
                    }))
                  : prev.facts,
            }
          : prev,
      );
    }

    return true;
  };

  /** Searches Steam for this game and always lets the user pick which result is right (even a single
   * one, e.g. "God of War" vs. "God of War Ragnarök") rather than guessing by name similarity. */
  const handleAutoFill = async (fields: FillFields, nameOverride?: string) => {
    const steamApi = window.electronAPI?.steam;
    if (!form || autoFilling || !steamApi) {
      return;
    }

    setAutoFilling(true);

    try {
      const searchName = nameOverride ?? (form.name.trim() || appName);
      const results = await steamApi.search(searchName);

      if (results.length === 0) {
        setShowAutoFillModal(false);
        setSteamNoMatch({ name: searchName, fields });

        return;
      }

      setShowAutoFillModal(false);
      setSteamNoMatch(null);
      setSteamPicker({ results, fields });
    } catch (err) {
      useNotificationStore
        .getState()
        .pushNotification(err instanceof Error ? err.message : t('editConfig.autoFillFailed'), 'error');
      setShowAutoFillModal(false);
    } finally {
      setAutoFilling(false);
    }
  };

  const handleNoMatchContinue = (name: string) => {
    if (!steamNoMatch) {
      return;
    }

    void handleAutoFill(steamNoMatch.fields, name);
  };

  const handlePickSteamResult = async (matchId: string) => {
    if (!steamPicker || autoFilling) {
      return;
    }

    const fields = steamPicker.fields;

    setSteamPicker(null);
    setAutoFilling(true);

    try {
      if (await applySteamMatch(matchId, fields)) {
        useNotificationStore.getState().pushNotification(t('editConfig.autoFillDone'));
      }
    } catch (err) {
      useNotificationStore
        .getState()
        .pushNotification(err instanceof Error ? err.message : t('editConfig.autoFillFailed'), 'error');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const result = await window.electronAPI?.content?.writeConfig(appId, formToConfig(form));
      if (result?.ok) {
        onSaved();
        onClose();
      } else {
        setSaveError(result?.error ?? t('editConfig.saveFailed'));
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('editConfig.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button type="button" className="btn edit-config-modal__cancel" onClick={onClose} data-gamepad-focusable>
        {t('editConfig.cancel')}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => setShowAutoFillModal(true)}
        disabled={!form || saving || autoFilling}
        data-gamepad-focusable
      >
        {autoFilling ? <Loader2 size={14} className="edit-config-modal__spin" /> : <Wand2 size={14} />}
        {autoFilling ? t('editConfig.autoFilling') : t('editConfig.autoFill')}
      </button>
      <button
        type="submit"
        form="edit-config-form"
        className="btn btn--accent"
        disabled={!form || saving}
        data-gamepad-focusable
      >
        {saving ? t('editConfig.saving') : t('editConfig.save')}
      </button>
    </>
  );

  return (
    <Modal
      title={t('editConfig.title')}
      ariaLabel={`${appName} — ${t('editConfig.title')}`}
      onClose={onClose}
      className="edit-config-modal"
      footer={footer}
      closeOnOverlayClick={false}
    >
      <div data-id="EditConfigModal">
        {loadError ? (
          <p className="edit-config-modal__error">{loadError}</p>
        ) : !form ? (
          <p className="edit-config-modal__loading">{t('editConfig.loading')}</p>
        ) : (
          <form id="edit-config-form" onSubmit={handleSubmit}>
            <section className="edit-config-modal__section">
              <h3>{t('editConfig.sectionGeneral')}</h3>

              <FormField label={t('editConfig.name')}>
                <input type="text" value={form.name} onChange={(event) => update('name', event.target.value)} />
              </FormField>

              <div className="edit-config-modal__row">
                <FormField label={t('editConfig.genre')}>
                  <select value={form.genre} onChange={(event) => update('genre', event.target.value)}>
                    <option value="">{t('editConfig.genreNone')}</option>
                    {GENRE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t('editConfig.series')}>
                  <input
                    type="text"
                    value={form.series}
                    onChange={(event) => update('series', event.target.value)}
                  />
                </FormField>
              </div>

              <div className="edit-config-modal__row">
                <FormField label={t('editConfig.rating')}>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={form.rating}
                    onChange={(event) => update('rating', event.target.value)}
                  />
                </FormField>

                <FormField label={t('editConfig.coverPosition')}>
                  <select
                    value={form.coverHorizontalPosition}
                    onChange={(event) => update('coverHorizontalPosition', event.target.value)}
                  >
                    <option value="top">{t('editConfig.coverPositionTop')}</option>
                    <option value="center">{t('editConfig.coverPositionCenter')}</option>
                    <option value="bottom">{t('editConfig.coverPositionBottom')}</option>
                  </select>
                </FormField>
              </div>

              <div className="edit-config-modal__row">
                <FormField label={t('editConfig.previewStart')}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="50"
                    value={form.previewStart}
                    onChange={(event) => update('previewStart', event.target.value)}
                  />
                </FormField>
              </div>
            </section>

            <section className="edit-config-modal__section">
              <h3>{t('editConfig.sectionLaunch')}</h3>

              <FormField label={t('editConfig.launchArgs')}>
                <input
                  type="text"
                  placeholder={t('editConfig.launchArgsHint')}
                  value={form.launchArgs}
                  onChange={(event) => update('launchArgs', event.target.value)}
                />
              </FormField>
            </section>

            <section className="edit-config-modal__section">
              <h3>{t('editConfig.sectionPaths')}</h3>

              <div className="edit-config-modal__row">
                {PATH_FIELDS.slice(0, 2).map(({ formKey, configField, labelKey, placeholder }) => (
                  <PathField
                    key={formKey}
                    label={t(labelKey)}
                    placeholder={placeholder}
                    value={form[formKey]}
                    onChange={(value) => update(formKey, value)}
                    onBrowse={() => browsePath(configField, formKey)}
                  />
                ))}
              </div>

              {PATH_FIELDS.slice(2, 5).map(({ formKey, configField, labelKey, placeholder, supportsFolder, hideFileBrowse }) => (
                <PathField
                  key={formKey}
                  label={t(labelKey)}
                  placeholder={placeholder}
                  value={form[formKey]}
                  onChange={(value) => update(formKey, value)}
                  onBrowse={hideFileBrowse ? undefined : () => browsePath(configField, formKey, 'file')}
                  onBrowseFolder={supportsFolder ? () => browsePath(configField, formKey, 'folder') : undefined}
                />
              ))}

              {PATH_FIELDS.slice(5).map(({ formKey, configField, labelKey, placeholder, supportsFolder, hideFileBrowse }) => (
                <PathField
                  key={formKey}
                  label={t(labelKey)}
                  placeholder={placeholder}
                  value={form[formKey]}
                  onChange={(value) => update(formKey, value)}
                  onBrowse={hideFileBrowse ? undefined : () => browsePath(configField, formKey, 'file')}
                  onBrowseFolder={supportsFolder ? () => browsePath(configField, formKey, 'folder') : undefined}
                />
              ))}
            </section>

            <section className="edit-config-modal__section">
              <h3>{t('editConfig.sectionCustomButtons')}</h3>

              <Reorder.Group
                as="div"
                axis="y"
                values={form.customButtons}
                onReorder={reorderCustomButtons}
                className="edit-config-modal__facts"
              >
                {form.customButtons.map((button) => (
                  <CustomButtonRow
                    key={button.id}
                    button={button}
                    onChange={(patch) => updateCustomButton(button.id, patch)}
                    onRemove={() => removeCustomButton(button.id)}
                    onBrowse={(mode) => browseCustomButtonPath(button.id, mode)}
                  />
                ))}
              </Reorder.Group>

              <button type="button" className="btn" onClick={addCustomButton} data-gamepad-focusable>
                <Plus size={16} />
                {t('editConfig.customButtonAdd')}
              </button>
            </section>

            <section className="edit-config-modal__section">
              <h3>
                {t('editConfig.sectionDescription')}
                <Tooltip label={t('editConfig.markupHint')}>
                  <Info size={14} className="edit-config-modal__markup-hint" aria-hidden="true" />
                </Tooltip>
              </h3>

              <FormField
                label={t('editConfig.descriptionRu')}
                action={
                  <TranslateButton
                    source={form.descriptionRu || form.descriptionEn}
                    target="ru"
                    onApply={(text) => update('descriptionRu', text)}
                  />
                }
              >
                <textarea
                  rows={4}
                  value={form.descriptionRu}
                  onChange={(event) => update('descriptionRu', event.target.value)}
                />
              </FormField>

              <FormField
                label={t('editConfig.descriptionEn')}
                action={
                  <TranslateButton
                    source={form.descriptionEn || form.descriptionRu}
                    target="en"
                    onApply={(text) => update('descriptionEn', text)}
                  />
                }
              >
                <textarea
                  rows={4}
                  value={form.descriptionEn}
                  onChange={(event) => update('descriptionEn', event.target.value)}
                />
              </FormField>
            </section>

            <section className="edit-config-modal__section">
              <h3>
                {t('editConfig.sectionInstructions')}
                <Tooltip label={t('editConfig.markupHint')}>
                  <Info size={14} className="edit-config-modal__markup-hint" aria-hidden="true" />
                </Tooltip>
              </h3>

              <FormField
                label={t('editConfig.instructionsRu')}
                action={
                  <TranslateButton
                    source={form.instructionsRu || form.instructionsEn}
                    target="ru"
                    onApply={(text) => update('instructionsRu', text)}
                  />
                }
              >
                <textarea
                  rows={6}
                  value={form.instructionsRu}
                  onChange={(event) => update('instructionsRu', event.target.value)}
                />
              </FormField>

              <FormField
                label={t('editConfig.instructionsEn')}
                action={
                  <TranslateButton
                    source={form.instructionsEn || form.instructionsRu}
                    target="en"
                    onApply={(text) => update('instructionsEn', text)}
                  />
                }
              >
                <textarea
                  rows={6}
                  value={form.instructionsEn}
                  onChange={(event) => update('instructionsEn', event.target.value)}
                />
              </FormField>
            </section>

            <section className="edit-config-modal__section">
              <h3>{t('editConfig.sectionNote')}</h3>

              <Reorder.Group
                as="div"
                axis="y"
                values={form.notes}
                onReorder={reorderNotes}
                className="edit-config-modal__notes"
              >
                {form.notes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onChange={(patch) => updateNote(note.id, patch)}
                    onRemove={() => removeNote(note.id)}
                  />
                ))}
              </Reorder.Group>

              <button type="button" className="btn" onClick={addNote} data-gamepad-focusable>
                <Plus size={16} />
                {t('editConfig.noteAdd')}
              </button>
            </section>

            <section className="edit-config-modal__section">
              <h3>{t('editConfig.sectionFacts')}</h3>

              <Reorder.Group
                as="div"
                axis="y"
                values={form.facts}
                onReorder={reorderFacts}
                className="edit-config-modal__facts"
              >
                {form.facts.map((fact) => (
                  <FactRow
                    key={fact.id}
                    fact={fact}
                    onChange={(patch) => updateFact(fact.id, patch)}
                    onRemove={() => removeFact(fact.id)}
                  />
                ))}
              </Reorder.Group>

              <button type="button" className="btn" onClick={addFact} data-gamepad-focusable>
                <Plus size={16} />
                {t('editConfig.factAdd')}
              </button>
            </section>
          </form>
        )}

        {saveError ? <p className="edit-config-modal__error">{saveError}</p> : null}
      </div>

      {showAutoFillModal ? (
        <BulkFillModal
          count={1}
          busy={autoFilling}
          onClose={() => setShowAutoFillModal(false)}
          onConfirm={(fields) => void handleAutoFill(fields)}
        />
      ) : null}

      {steamPicker ? (
        <SteamPickerModal
          results={steamPicker.results}
          busy={autoFilling}
          onPick={(id) => void handlePickSteamResult(id)}
          onClose={() => setSteamPicker(null)}
        />
      ) : null}

      {steamNoMatch ? (
        <SteamNoMatchModal
          initialName={steamNoMatch.name}
          busy={autoFilling}
          onContinue={handleNoMatchContinue}
          onSkip={() => setSteamNoMatch(null)}
          onClose={() => setSteamNoMatch(null)}
        />
      ) : null}
    </Modal>
  );
};
