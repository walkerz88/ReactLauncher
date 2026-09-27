import { useState, type FC } from 'react';

import { useTranslation, type MessageKey } from '@/app/i18n';
import {
  COLOR_FIELDS,
  CUSTOM_THEME_ID_PREFIX,
  MAX_THEME_NAME_LENGTH,
  type ThemeColors,
  type ThemeDefinition,
  type ThemeMode,
} from '@/app/lib/themes';
import { FormField } from '@/shared/FormField';
import { Modal } from '@/shared/Modal';
import { ToggleGroup, type ToggleGroupOption } from '@/shared/ToggleGroup';

import { ThemePreview } from './ThemePreview';

export interface ThemeEditorProps {
  /** The theme being edited, or a template (colors of the active theme) for a new one. */
  initial: ThemeDefinition;
  /** Whether `initial` is an existing custom theme rather than a template. */
  isEditing: boolean;
  onSave: (theme: ThemeDefinition) => void;
  onClose: () => void;
}

const COLOR_LABEL_KEYS: Record<keyof ThemeColors, MessageKey> = {
  bg: 'themeEditor.colorBg',
  surface: 'themeEditor.colorSurface',
  text: 'themeEditor.colorText',
  accent: 'themeEditor.colorAccent',
};

export const ThemeEditor: FC<ThemeEditorProps> = ({ initial, isEditing, onSave, onClose }) => {
  const t = useTranslation();
  const [name, setName] = useState(initial.name);
  const [mode, setMode] = useState<ThemeMode>(initial.mode);
  const [colors, setColors] = useState<ThemeColors>(initial.colors);

  const trimmedName = name.trim();
  const draft: ThemeDefinition = { id: initial.id, name: trimmedName, mode, colors };

  const modeOptions: ToggleGroupOption<ThemeMode>[] = [
    { value: 'dark', label: t('theme.dark') },
    { value: 'light', label: t('theme.light') },
  ];

  const save = () => {
    if (!trimmedName) {
      return;
    }

    onSave({ ...draft, id: isEditing ? initial.id : `${CUSTOM_THEME_ID_PREFIX}${Date.now()}` });
  };

  const footer = (
    <>
      <button type="button" className="btn" onClick={onClose} data-gamepad-focusable>
        {t('themeEditor.cancel')}
      </button>
      <button type="button" className="btn btn--accent" disabled={!trimmedName} onClick={save} data-gamepad-focusable>
        {t('themeEditor.save')}
      </button>
    </>
  );

  return (
    <Modal
      title={t(isEditing ? 'themeEditor.titleEdit' : 'themeEditor.titleNew')}
      ariaLabel={t(isEditing ? 'themeEditor.titleEdit' : 'themeEditor.titleNew')}
      onClose={onClose}
      className="theme-editor"
      footer={footer}
      closeOnOverlayClick={false}
    >
      <div className="theme-editor__body" data-id="ThemeEditor">
        <ThemePreview theme={draft} />

        <FormField label={t('themeEditor.name')}>
          <input
            type="text"
            value={name}
            maxLength={MAX_THEME_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </FormField>

        <div className="theme-editor__mode">
          <span className="theme-editor__label">{t('themeEditor.mode')}</span>
          <ToggleGroup options={modeOptions} value={mode} onChange={setMode} ariaLabel={t('themeEditor.mode')} />
        </div>

        <div className="theme-editor__colors">
          {COLOR_FIELDS.map((field) => (
            <label key={field} className="theme-editor__color">
              <input
                type="color"
                value={colors[field]}
                onChange={(event) => setColors((prev) => ({ ...prev, [field]: event.target.value }))}
                data-gamepad-focusable
              />
              <span className="theme-editor__color-text">
                <span>{t(COLOR_LABEL_KEYS[field])}</span>
                <code>{colors[field]}</code>
              </span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
};
