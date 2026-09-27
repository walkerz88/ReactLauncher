import { useEffect } from 'react';

import { useFavoritesStore } from '@/app/store/favoritesStore';
import { useProgressStore } from '@/app/store/progressStore';
import { useSoundStore } from '@/app/store/soundStore';
import { playAchievementSound } from '@/app/lib/achievementSound';
import { reportProgress } from '@/app/lib/progressEvents';
import { resolveTheme, useThemeStore } from '@/app/store/themeStore';

/**
 * Keeps the progress mirror in sync with the main process and reports the two things only the window can
 * see — a game newly added to favourites, a custom theme newly created. Call once.
 */
export const useProgressSync = (): void => {
  useEffect(() => {
    const progress = window.electronAPI?.progress;

    if (!progress) {
      return undefined;
    }

    const loadInitial = async () => {
      try {
        useProgressStore.getState().setView(await progress.get());
      } catch (err) {
        console.error('Loading progress failed:', err);
      }
    };

    void loadInitial();

    const stopChanged = progress.onChanged((view) => useProgressStore.getState().setView(view));
    const stopNotify = progress.onNotify((notification) => {
      useProgressStore.getState().pushToast(notification);

      if (notification.type === 'achievement' && useSoundStore.getState().achievementSoundEnabled) {
        playAchievementSound();
      }
    });

    let knownFavorites = new Set(useFavoritesStore.getState().ids);
    const stopFavorites = useFavoritesStore.subscribe((state) => {
      state.ids.filter((id) => !knownFavorites.has(id)).forEach((id) => void reportProgress('favorite', id));
      knownFavorites = new Set(state.ids);
    });

    let knownThemes = new Set(useThemeStore.getState().customThemes.map((theme) => theme.id));
    const stopThemes = useThemeStore.subscribe((state) => {
      state.customThemes.filter((theme) => !knownThemes.has(theme.id)).forEach((theme) => void reportProgress('theme', theme.id));
      knownThemes = new Set(state.customThemes.map((theme) => theme.id));
    });

    const NIGHT_ENDS_AT_HOUR = 5;

    // The theme in use at start counts as tried; after that, every switch does.
    void reportProgress('themeUsed', useThemeStore.getState().theme);

    let activeTheme = useThemeStore.getState().theme;
    const stopThemeChoice = useThemeStore.subscribe((state) => {
      if (state.theme === activeTheme) {
        return;
      }

      activeTheme = state.theme;
      void reportProgress('themeUsed', state.theme);

      if (resolveTheme(state.theme, state.customThemes).mode === 'light' && new Date().getHours() < NIGHT_ENDS_AT_HOUR) {
        void reportProgress('feature', 'light-at-night');
      }
    });

    return () => {
      stopThemeChoice();
      stopChanged();
      stopNotify();
      stopFavorites();
      stopThemes();
    };
  }, []);
};
