import { useState, type FC } from 'react';
import { NavLink } from 'react-router-dom';
import { Download, Heart, Home, LogOut, Maximize, Minimize, RotateCw, Settings, UserRound } from 'lucide-react';

import { useFullscreenState } from '@/app/hooks/useFullscreenState';
import { useFavoritesStore } from '@/app/store/favoritesStore';
import { useContentStore } from '@/app/store/contentStore';
import { useNotificationStore } from '@/app/store/notificationStore';
import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTorrentsStore } from '@/app/store/torrentsStore';
import { useTranslation } from '@/app/i18n';
import { AddGameButton } from '@/features/AddGame';
import { ConfirmModal } from '@/shared/ConfirmModal';
import { Tooltip } from '@/shared/Tooltip';

import './AppNavigation.css';

const ICON_SIZE = 22;

export const AppNavigation: FC = () => {
  const t = useTranslation();
  const isFullscreen = useFullscreenState();
  const hasFavorites = useFavoritesStore((state) => state.ids.length > 0);
  const favoritesEnabled = useSectionsStore((state) => state.favoritesEnabled);
  const addGameEnabled = useSectionsStore((state) => state.addGameEnabled);
  const torrentEnabled = useSectionsStore((state) => state.torrentEnabled);
  const hasTorrents = useTorrentsStore((state) => state.torrents.length > 0);
  const showDownloads = torrentEnabled || hasTorrents;
  const isDownloading = useTorrentsStore((state) =>
    state.torrents.some((torrent) => torrent.state === 'downloading' || torrent.state === 'metadata'),
  );
  const isRescanning = useContentStore((state) => state.status === 'loading');
  const rescan = useContentStore((state) => state.loadApps);
  const [confirmingExit, setConfirmingExit] = useState(false);

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

      {showDownloads ? (
        <Tooltip label={t('nav.downloads')} placement="right">
          <NavLink to="/downloads" className="app-navigation__item" aria-label={t('nav.downloads')} data-gamepad-focusable>
            <Download size={ICON_SIZE} />
            {isDownloading ? <span className="app-navigation__badge" aria-hidden="true" /> : null}
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

      {addGameEnabled ? <AddGameButton className="app-navigation__item--push" /> : null}

      <Tooltip label={t('nav.rescan')} placement="right">
        <button
          type="button"
          className={['app-navigation__item', !addGameEnabled && 'app-navigation__item--push'].filter(Boolean).join(' ')}
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
          onClick={() => setConfirmingExit(true)}
          aria-label={t('nav.exit')}
          data-gamepad-focusable
        >
          <LogOut size={ICON_SIZE} />
        </button>
      </Tooltip>

      {confirmingExit ? (
        <ConfirmModal
          title={t('nav.exitTitle')}
          message={t('nav.exitConfirm')}
          confirmLabel={t('nav.exit')}
          cancelLabel={t('nav.exitCancel')}
          danger
          onConfirm={handleExit}
          onCancel={() => setConfirmingExit(false)}
        />
      ) : null}
    </nav>
  );
};
