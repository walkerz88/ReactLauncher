import { useState, type FC } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { PRESET_THEMES, type ThemeDefinition } from '@/app/lib/themes';
import { resolveTheme, useThemeStore } from '@/app/store/themeStore';
import { ConfirmModal } from '@/shared/ConfirmModal';

import { ThemeEditor } from './components/ThemeEditor';
import { ThemeSwatches } from './components/ThemeSwatches';

import './ThemePicker.css';

interface EditorState {
  initial: ThemeDefinition;
  isEditing: boolean;
}

export const ThemePicker: FC = () => {
  const t = useTranslation();
  const activeId = useThemeStore((state) => state.theme);
  const customThemes = useThemeStore((state) => state.customThemes);
  const setTheme = useThemeStore((state) => state.setTheme);
  const saveCustomTheme = useThemeStore((state) => state.saveCustomTheme);
  const deleteCustomTheme = useThemeStore((state) => state.deleteCustomTheme);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [themeToDelete, setThemeToDelete] = useState<ThemeDefinition | null>(null);

  const themeName = (theme: ThemeDefinition): string =>
    theme.id === 'dark' || theme.id === 'light' ? t(`theme.${theme.id}`) : theme.name;

  const startCreating = () => {
    const active = resolveTheme(activeId, customThemes);

    setEditor({ initial: { ...active, id: '', name: t('themeEditor.defaultName') }, isEditing: false });
  };

  const confirmDelete = () => {
    if (themeToDelete) {
      deleteCustomTheme(themeToDelete.id);
    }

    setThemeToDelete(null);
  };

  const save = (theme: ThemeDefinition) => {
    saveCustomTheme(theme);
    setTheme(theme.id);
    setEditor(null);
  };

  const renderTheme = (theme: ThemeDefinition, isCustom: boolean) => (
    <li key={theme.id} className="theme-picker__item">
      <button
        type="button"
        className="theme-picker__card"
        role="radio"
        aria-checked={activeId === theme.id}
        onClick={() => setTheme(theme.id)}
        data-gamepad-focusable
      >
        <ThemeSwatches theme={theme} />
        <span className="theme-picker__name">{themeName(theme)}</span>
      </button>

      {isCustom ? (
        <div className="theme-picker__actions">
          <button
            type="button"
            className="theme-picker__action"
            aria-label={t('theme.edit')}
            onClick={() => setEditor({ initial: theme, isEditing: true })}
            data-gamepad-focusable
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="theme-picker__action"
            aria-label={t('theme.delete')}
            onClick={() => setThemeToDelete(theme)}
            data-gamepad-focusable
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}
    </li>
  );

  return (
    <div data-id="ThemePicker">
      <ul className="theme-picker" role="radiogroup" aria-label={t('theme.groupLabel')}>
        {PRESET_THEMES.map((theme) => renderTheme(theme, false))}
        {customThemes.map((theme) => renderTheme(theme, true))}

        <li className="theme-picker__item">
          <button
            type="button"
            className="theme-picker__card theme-picker__card--add"
            onClick={startCreating}
            data-gamepad-focusable
          >
            <Plus size={12} />
            <span className="theme-picker__name">{t('theme.create')}</span>
          </button>
        </li>
      </ul>

      {themeToDelete ? (
        <ConfirmModal
          title={t('theme.delete')}
          message={t('theme.deleteConfirm').replace('{name}', themeToDelete.name)}
          confirmLabel={t('theme.delete')}
          cancelLabel={t('themeEditor.cancel')}
          danger
          onConfirm={confirmDelete}
          onCancel={() => setThemeToDelete(null)}
        />
      ) : null}

      {editor ? (
        <ThemeEditor initial={editor.initial} isEditing={editor.isEditing} onSave={save} onClose={() => setEditor(null)} />
      ) : null}
    </div>
  );
};
