import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/app/i18n/messages';

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

const applyLocaleToDocument = (locale: Locale): void => {
  document.documentElement.lang = locale;
};

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

/**
 * Persisted interface language. Same pattern as `themeStore`: `persist` writes to
 * `localStorage` (kept in Electron's user-data dir), so the choice survives a
 * restart. `localStorage` is synchronous, so the store is rehydrated by the time
 * this module finishes evaluating.
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'locale',
      storage: createJSONStorage(() => profileStorage),
      version: 1,
      merge: (persisted, current) => {
        const stored = (persisted as Partial<LocaleState> | undefined)?.locale;

        return { ...current, locale: isLocale(stored) ? stored : current.locale };
      },
    },
  ),
);

// Keep <html lang> in sync with the store, now and on every change.
applyLocaleToDocument(useLocaleStore.getState().locale);
useLocaleStore.subscribe((state) => applyLocaleToDocument(state.locale));
