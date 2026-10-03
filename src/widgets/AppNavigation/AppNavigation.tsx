import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Home, LogOut, Maximize, Minimize, RotateCw, Settings, UserRound } from 'lucide-react';

import { useFullscreenState } from '@/app/hooks/useFullscreenState';
import { useFavoritesStore } from '@/app/store/favoritesStore';
import { useContentStore } from '@/app/store/contentStore';
import { useNotificationStore } from '@/app/store/notificationStore';
import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { AddGameButton } from '@/features/AddGame';
import { Tooltip } from '@/shared/Tooltip';

import './AppNavigation.css';

const ICON_SIZE = 22;

export const AppNavigation: FC = () => {
  const t = useTranslation();
  const isFullscreen = useFullscreenState();
  const hasFavorites = useFavoritesStore((state) => state.ids.length > 0);
  const favoritesEnabled = useSectionsStore((state) => state.favoritesEnabled);
  const isRescanning = useContentStore((state) => state.status === 'loading');
  const rescan = useContentStore((state) => state.loadApps);

  const handleRescan = async () => {
    try {
      await rescan();

      if (useContentStore.getState().status === 'ready') {
        useNotificationStore.getState().pushNotification(t('nav.rescanSuccess'));
      }
    } catch (err) {
      console.error('Rescan failed:', err);
    }
  };

  const toggleFullscreen = () => {
    void window.electronAPI?.window?.toggleFullscreen();
  };

  const handleExit = () => {
    window.electronAPI?.quit();
  };

  const fullscreenLabel = isFullscreen ? t('nav.windowed') : t('nav.fullscreen');

  return (
    <nav className="app-navigation" data-id="AppNavigation">
      <Tooltip label={t('nav.home')} placement="right">
        <NavLink to="/" end className="app-navigation__item" aria-label={t('nav.home')} data-gamepad-focusable>
          <Home size={ICON_SIZE} />
        </NavLink>
      </Tooltip>

      {hasFavorites && favoritesEnabled ? (
        <Tooltip label={t('nav.favorites')} placement="right">
          <NavLink to="/favorites" className="app-navigation__item" aria-label={t('nav.favorites')} data-gamepad-focusable>
            <Heart size={ICON_SIZE} />
          </NavLink>
        </Tooltip>
      ) : null}

      <Tooltip label={t('nav.profile')} placement="right">
        <NavLink to="/achievements" className="app-navigation__item" aria-label={t('nav.profile')} data-gamepad-focusable>
          <UserRound size={ICON_SIZE} />
        </NavLink>
      </Tooltip>

      <Tooltip label={t('nav.settings')} placement="right">
        <NavLink to="/settings" className="app-navigation__item" aria-label={t('nav.settings')} data-gamepad-focusable>
          <Settings size={ICON_SIZE} />
        </NavLink>
      </Tooltip>

      <AddGameButton className="app-navigation__item--push" />

      <Tooltip label={t('nav.rescan')} placement="right">
        <button
          type="button"
          className="app-navigation__item"
          onClick={() => void handleRescan()}
          disabled={isRescanning}
          aria-label={t('nav.rescan')}
          aria-busy={isRescanning}
          data-gamepad-focusable
        >
          <RotateCw size={ICON_SIZE} className={isRescanning ? 'app-navigation__icon--spin' : undefined} />
        </button>
      </Tooltip>

      <Tooltip label={fullscreenLabel} placement="right">
        <button
          type="button"
          className="app-navigation__item"
          onClick={toggleFullscreen}
          aria-label={fullscreenLabel}
          aria-pressed={!isFullscreen}
          data-gamepad-focusable
        >
          {isFullscreen ? <Minimize size={ICON_SIZE} /> : <Maximize size={ICON_SIZE} />}
        </button>
      </Tooltip>

      <Tooltip label={t('nav.exit')} placement="right">
        <button
          type="button"
          className="app-navigation__item app-navigation__item--exit"
          onClick={handleExit}
          aria-label={t('nav.exit')}
          data-gamepad-focusable
        >
          <LogOut size={ICON_SIZE} />
        </button>
      </Tooltip>
    </nav>
  );
};
