import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';
import {
  buildThemeVars,
  DEFAULT_THEME_ID,
  isCustomTheme,
  PRESET_THEMES,
  STYLESHEET_THEME_IDS,
  THEME_VAR_NAMES,
  type ThemeDefinition,
} from '@/app/lib/themes';

const MAX_CUSTOM_THEMES = 20;

interface ThemeState {
  /** Id of the active theme: a preset id or a custom theme's id. */
  theme: string;
  customThemes: ThemeDefinition[];
  setTheme: (id: string) => void;
  /** Adds the theme, or replaces the custom theme with the same id. */
  saveCustomTheme: (theme: ThemeDefinition) => void;
  deleteCustomTheme: (id: string) => void;
}

/** The theme `id` refers to; falls back to the default if it no longer exists (e.g. a deleted custom theme). */
export const resolveTheme = (id: string, customThemes: ThemeDefinition[]): ThemeDefinition =>
  [...PRESET_THEMES, ...customThemes].find((theme) => theme.id === id) ??
  PRESET_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ??
  PRESET_THEMES[0];

/**
 * Reflect the active theme onto `<html>`: `data-theme` carries the mode (so the
 * stylesheet's base tokens and `color-scheme` apply), and themes other than the
 * stylesheet ones override every color token inline.
 */
const applyThemeToDocument = (theme: ThemeDefinition): void => {
  const root = document.documentElement;
  root.dataset.theme = theme.mode;

  THEME_VAR_NAMES.forEach((name) => root.style.removeProperty(name));

  if (!STYLESHEET_THEME_IDS.includes(theme.id)) {
    Object.entries(buildThemeVars(theme)).forEach(([name, value]) => root.style.setProperty(name, value));
  }

  // `index.html`'s pre-paint boot script sets an inline `background-color` on
  // `<html>` to avoid a white flash before this module runs. Clear it now that
  // the real CSS is in charge, otherwise it permanently sits in front of
  // `.app-background`'s gradient (it's a solid color painted at the html box
  // level, not just the canvas fill CSS would normally propagate from `body`).
  root.style.backgroundColor = '';
};

/**
 * Persisted theme store. It is saved in the active profile's file (see `lib/profile`), which the
 * renderer reads synchronously at startup, so the store is already rehydrated by the time this
 * module finishes evaluating.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: DEFAULT_THEME_ID,
      customThemes: [],
      setTheme: (id) => set({ theme: id }),
      saveCustomTheme: (theme) =>
        set((state) => {
          const exists = state.customThemes.some((entry) => entry.id === theme.id);

          if (!exists && state.customThemes.length >= MAX_CUSTOM_THEMES) {
            return state;
          }

          return {
            customThemes: exists
              ? state.customThemes.map((entry) => (entry.id === theme.id ? theme : entry))
              : [...state.customThemes, theme],
          };
        }),
      deleteCustomTheme: (id) =>
        set((state) => ({
          customThemes: state.customThemes.filter((entry) => entry.id !== id),
          theme: state.theme === id ? DEFAULT_THEME_ID : state.theme,
        })),
    }),
    {
      name: 'theme',
      storage: createJSONStorage(() => profileStorage),
      version: 2,
      // `themeMode` / `themeBg` are for `index.html`'s pre-paint boot script, which can't resolve a theme id.
      partialize: (state) => {
        const active = resolveTheme(state.theme, state.customThemes);

        return {
          theme: state.theme,
          customThemes: state.customThemes,
          themeMode: active.mode,
          themeBg: active.colors.bg,
        };
      },
      merge: (persisted, current) => {
        const stored = persisted as Partial<ThemeState> | undefined;
        const storedThemes: unknown = stored?.customThemes;
        const customThemes = Array.isArray(storedThemes)
          ? storedThemes.filter(isCustomTheme).slice(0, MAX_CUSTOM_THEMES)
          : [];
        const theme = typeof stored?.theme === 'string' ? stored.theme : current.theme;

        return { ...current, customThemes, theme: resolveTheme(theme, customThemes).id };
      },
    },
  ),
);

const syncDocument = (state: ThemeState): void =>
  applyThemeToDocument(resolveTheme(state.theme, state.customThemes));

// Keep <html> in sync with the store, now and on every change.
syncDocument(useThemeStore.getState());
useThemeStore.subscribe(syncDocument);
