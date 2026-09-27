import { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Gift,
  Heart,
  Loader2,
  Play,
  Square,
} from 'lucide-react';

import { useContentStore } from '@/app/store/contentStore';
import { launchFactEvents, reportProgress } from '@/app/lib/progressEvents';
import { useFavoritesStore } from '@/app/store/favoritesStore';
import { useLocaleStore } from '@/app/store/localeStore';
import { useRecentStore } from '@/app/store/recentStore';
import { usePlaytimeStore } from '@/app/store/playtimeStore';
import { useRunningStore } from '@/app/store/runningStore';
import { formatPlaytime, formatRelativeTime } from '@/app/lib/format';
import { useTranslation } from '@/app/i18n';
import { Message } from '@/shared/Message';
import { RatingBadge } from '@/shared/RatingBadge';
import { Tooltip } from '@/shared/Tooltip';

import { BackupsModal } from './components/BackupsModal';
import { EditConfigModal } from './components/EditConfigModal';
import { GameSettingsMenu } from './components/GameSettingsMenu';
import { InstructionsModal } from './components/InstructionsModal';
import { MediaSection } from './components/MediaSection';
import { PlayerGallery } from './components/PlayerGallery';
import './PreviewPage.css';

const LAUNCH_SPINNER_MIN_MS = 10_000;

export const PreviewPage: FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);

  const apps = useContentStore((state) => state.apps);
  const status = useContentStore((state) => state.status);
  const loadApps = useContentStore((state) => state.loadApps);
  const launchApp = useContentStore((state) => state.launchApp);

  const isFavorite = useFavoritesStore((state) => state.ids.includes(id));
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const recordLaunch = useRecentStore((state) => state.recordLaunch);
  const recordPlayedLaunch = usePlaytimeStore((state) => state.recordLaunch);
  const playtime = usePlaytimeStore((state) => state.byId[id]);
  const isRunning = useRunningStore((state) => state.ids.includes(id));

  const playButtonRef = useRef<HTMLButtonElement>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showEditConfig, setShowEditConfig] = useState(false);
  const [showBackups, setShowBackups] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      void loadApps();
    }
  }, [status, loadApps]);

  const app = apps.find((entry) => entry.id === id);
  const appIndex = apps.findIndex((entry) => entry.id === id);
  const prevApp = appIndex > 0 ? apps[appIndex - 1] : null;
  const nextApp = appIndex >= 0 && appIndex < apps.length - 1 ? apps[appIndex + 1] : null;

  useEffect(() => {
    if (app) {
      playButtonRef.current?.focus();
    }
  }, [app]);

  if (!app) {
    const isLoading = status === 'idle' || status === 'loading';

    // Mirror the loaded layout's shape (hero / title / actions) while
    // scanning, so the page doesn't jump in height once data arrives.
    return (
      <div className="app-page page--scroll-pad" data-id="PreviewPage">
        {isLoading ? (
          <>
            <div className="app-page__hero">
              <div className="app-page__hero-fill app-page__skeleton" />
              <button type="button" className="app-page__back" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} />
                {t('app.back')}
              </button>
            </div>
            <div className="app-page__title-row">
              <div className="app-page__skeleton app-page__skeleton--title" />
            </div>
            <div className="app-page__actions">
              <div className="app-page__skeleton app-page__skeleton--button" />
              <div className="app-page__skeleton app-page__skeleton--icon" />
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="app-page__back app-page__back--standalone"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={16} />
              {t('app.back')}
            </button>
            <p className="app-page__note">{t('app.notFound')}</p>
          </>
        )}
      </div>
    );
  }

  const showInstallPrimary = app.hasInstaller && !app.hasDataFiles;
  const playLabel = app.genre === 'genre.app' ? t('app.launch') : t('app.play');
  const description =
    app.description?.[locale] ?? app.description?.en ?? app.description?.ru ?? null;
  const instructions =
    app.instructions?.[locale] ?? app.instructions?.en ?? app.instructions?.ru ?? null;

  const handleInstallClick = async () => {
    setIsLaunching(true);
    try {
      await window.electronAPI?.content?.openInstaller(app.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLaunching(false);
    }
  };

  const handlePlayClick = async () => {
    setIsLaunching(true);
    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, LAUNCH_SPINNER_MIN_MS));
      const [ok] = await Promise.all([launchApp(app.id), minDelay]);
      if (ok) {
        recordLaunch(app.id);
        recordPlayedLaunch(app.id);

        const launchedIds = new Set(Object.keys(usePlaytimeStore.getState().byId));

        launchFactEvents(app, apps, launchedIds).forEach(([kind, factId]) => void reportProgress(kind, factId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleStopClick = async () => {
    try {
      await window.electronAPI?.content?.stop(app.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-page page--scroll-pad" data-id="PreviewPage">
      <div className="app-page__hero">
        {app.coverHorizontal ? (
          <img
            src={app.coverHorizontal}
            alt=""
            draggable={false}
            style={{ objectPosition: app.coverHorizontalPosition }}
          />
        ) : (
          <div className="app-page__hero-fallback">{app.name.charAt(0)}</div>
        )}

        <button type="button" className="app-page__back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          {t('app.back')}
        </button>
      </div>

      <div className="app-page__title-row">
        <h1 className="app-page__title">{app.name}</h1>
        {app.rating != null ? <RatingBadge rating={app.rating} size="md" /> : null}
        {isRunning ? (
          <span className="app-page__running">
            <span className="app-page__running-dot" aria-hidden="true" />
            {t('app.running')}
          </span>
        ) : null}
      </div>

      {playtime && (playtime.seconds > 0 || playtime.lastPlayedAt) ? (
        <p className="app-page__playtime">
          {playtime.seconds > 0 ? (
            <span>
              {t('app.playtime')}: <strong>{formatPlaytime(playtime.seconds, t)}</strong>
            </span>
          ) : null}
          {playtime.lastPlayedAt ? (
            <span>
              {t('app.lastPlayed')}: <strong>{formatRelativeTime(playtime.lastPlayedAt, locale)}</strong>
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="app-page__actions">
        {isRunning ? (
          <button
            ref={playButtonRef}
            type="button"
            className="btn btn--danger"
            onClick={() => void handleStopClick()}
            data-gamepad-focusable
          >
            <Square size={18} />
            {t('app.stop')}
          </button>
        ) : showInstallPrimary ? (
          <button
            ref={playButtonRef}
            type="button"
            className="btn btn--accent"
            onClick={handleInstallClick}
            disabled={isLaunching}
            data-gamepad-focusable
          >
            {isLaunching ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
            {t('app.installLocally')}
          </button>
        ) : (
          <button
            ref={playButtonRef}
            type="button"
            className="btn btn--accent"
            onClick={handlePlayClick}
            disabled={!app.hasExec || isLaunching}
            // Kept as a native `title`, not the `Tooltip` component: a `disabled` button doesn't
            // receive the mouse events a hover-driven tooltip needs, but the native one still works.
            title={app.hasExec ? undefined : t('app.noExec')}
            data-gamepad-focusable
          >
            {isLaunching ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
            {playLabel}
          </button>
        )}

        {instructions ? (
          <button
            type="button"
            className="btn"
            onClick={() => setShowInstructions(true)}
            data-gamepad-focusable
          >
            <BookOpen size={18} />
            {t('app.instructions')}
          </button>
        ) : null}

        {app.hasSettings ? (
          <button
            type="button"
            className="btn"
            onClick={() => void window.electronAPI?.content?.openSettings(app.id)}
            data-gamepad-focusable
          >
            {t('app.externalSettings')}
          </button>
        ) : null}

        {app.hasBonusContent ? (
          <button
            type="button"
            className="btn"
            onClick={() => void window.electronAPI?.content?.openBonus(app.id)}
            data-gamepad-focusable
          >
            <Gift size={18} />
            {t('app.bonusContent')}
          </button>
        ) : null}

        <GameSettingsMenu
          appId={app.id}
          hasInstaller={app.hasInstaller && !showInstallPrimary}
          hasSaves={app.hasSaves}
          onEditData={() => setShowEditConfig(true)}
          onOpenBackups={() => setShowBackups(true)}
        />

        <Tooltip label={isFavorite ? t('app.favoriteRemove') : t('app.favoriteAdd')}>
          <button
            type="button"
            className="icon-btn"
            aria-pressed={isFavorite}
            onClick={() => toggleFavorite(app.id)}
            data-gamepad-focusable
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </Tooltip>

        <div className="app-page__nav">
          <button
            type="button"
            className="icon-btn"
            disabled={!prevApp}
            aria-label={t('app.previous')}
            onClick={() => prevApp && navigate(`/app/${encodeURIComponent(prevApp.id)}`)}
            data-gamepad-focusable
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            className="icon-btn"
            disabled={!nextApp}
            aria-label={t('app.next')}
            onClick={() => nextApp && navigate(`/app/${encodeURIComponent(nextApp.id)}`)}
            data-gamepad-focusable
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {app.previewNotes.map((note, index) => {
        const noteText = note.text[locale] ?? note.text.en ?? note.text.ru;

        return noteText ? (
          <Message key={index} type={note.type}>
            {noteText}
          </Message>
        ) : null;
      })}

      <div className="app-page__sections">
        {description ? (
          <div className="app-page__description instructions-modal__text">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{description}</ReactMarkdown>
          </div>
        ) : null}

        {app.facts.length > 0 ? (
          <dl className="app-page__facts">
            {app.facts.map((fact, index) => (
              <div className="app-page__fact" key={index}>
                <dt>{fact.label[locale] ?? fact.label.en ?? fact.label.ru}</dt>
                <dd>{fact.value[locale] ?? fact.value.en ?? fact.value.ru}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <PlayerGallery appId={app.id} />

        <MediaSection screenshots={app.screenshots} trailer={app.trailer} />
      </div>

      {showInstructions && instructions ? (
        <InstructionsModal
          appName={app.name}
          text={instructions}
          onClose={() => setShowInstructions(false)}
        />
      ) : null}

      {showBackups ? (
        <BackupsModal appId={app.id} appName={app.name} onClose={() => setShowBackups(false)} />
      ) : null}

      {showEditConfig ? (
        <EditConfigModal
          appId={app.id}
          appName={app.name}
          onClose={() => setShowEditConfig(false)}
          onSaved={() => void loadApps()}
        />
      ) : null}
    </div>
  );
};
