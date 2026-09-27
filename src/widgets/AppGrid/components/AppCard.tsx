import { useEffect, useRef, useState, type FC, type PointerEvent, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { getHealthIssues, hasCriticalHealthIssue } from '@/app/lib/libraryHealth';
import { reportProgress } from '@/app/lib/progressEvents';
import { useCardsStore } from '@/app/store/cardsStore';
import type { ContentApp } from '@/electron';
import { RatingBadge } from '@/shared/RatingBadge';
import { Tooltip } from '@/shared/Tooltip';

export interface AppCardProps {
  app: ContentApp;
}

const TRAILER_DELAY_MS = 700;
/** A hover preview only counts as a "view" once it's actually played this long — a quick hover-and-leave shouldn't. */
const TRAILER_VIEW_THRESHOLD_MS = 3000;
const MAX_TILT_DEG = 7;
const MAX_SHIFT_PX = 8;
/** Where the preview starts within the trailer, to skip the logos and rating cards trailers open with; a game's `previewStart` overrides it. */
const DEFAULT_PREVIEW_START_PERCENT = 50;

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Gallery card: the cover tilts toward the cursor with a glare, and the trailer plays after a short hover. */
export const AppCard: FC<AppCardProps> = ({ app }) => {
  const t = useTranslation();
  const coverRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number>();
  const viewTimerRef = useRef<number>();
  const trailerStartRef = useRef(0);
  const animated = useCardsStore((state) => state.animateOnHover);
  const trailerEnabled = useCardsStore((state) => state.previewTrailer);
  const [isTrailerMounted, setIsTrailerMounted] = useState(false);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);

  const cover = app.coverVertical ?? app.coverHorizontal;
  const criticalHealth = hasCriticalHealthIssue(app);
  // The badge is cover-only (a missing trailer isn't shown here) — and both covers missing reads as
  // one "no covers" message instead of joining the two separate per-orientation warnings.
  const coverIssues = getHealthIssues(app).filter(
    (issue): issue is 'noCoverHorizontal' | 'noCoverVertical' => issue === 'noCoverHorizontal' || issue === 'noCoverVertical',
  );
  const healthWarning = coverIssues.length === 2 ? t('health.noCovers') : coverIssues.map((issue) => t(`health.${issue}`)).join(', ');

  const resetCover = () => {
    const element = coverRef.current;

    if (!element) {
      return;
    }

    ['--tilt-x', '--tilt-y', '--shift-x', '--shift-y', '--glare-x', '--glare-y'].forEach((name) =>
      element.style.removeProperty(name),
    );
  };

  const stopTrailer = () => {
    window.clearTimeout(timerRef.current);
    window.clearTimeout(viewTimerRef.current);
    setIsTrailerMounted(false);
    setIsTrailerPlaying(false);
  };

  const handleTrailerMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;

    const startPercent = app.previewStart ?? DEFAULT_PREVIEW_START_PERCENT;

    trailerStartRef.current = Number.isFinite(video.duration) ? (video.duration * startPercent) / 100 : 0;
    video.currentTime = trailerStartRef.current;
  };

  const handleTrailerEnded = async (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    video.currentTime = trailerStartRef.current;

    try {
      await video.play();
    } catch {
      // the card was left while the trailer was restarting
    }
  };

  const handlePointerEnter = (event: PointerEvent) => {
    if (!trailerEnabled || event.pointerType === 'touch' || !app.trailer || prefersReducedMotion()) {
      return;
    }

    timerRef.current = window.setTimeout(() => setIsTrailerMounted(true), TRAILER_DELAY_MS);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const element = coverRef.current;

    if (!animated || !element || event.pointerType === 'touch' || prefersReducedMotion()) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    element.style.setProperty('--tilt-x', `${((0.5 - y) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    element.style.setProperty('--tilt-y', `${((x - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    element.style.setProperty('--shift-x', `${((0.5 - x) * 2 * MAX_SHIFT_PX).toFixed(2)}px`);
    element.style.setProperty('--shift-y', `${((0.5 - y) * 2 * MAX_SHIFT_PX).toFixed(2)}px`);
    element.style.setProperty('--glare-x', `${(x * 100).toFixed(1)}%`);
    element.style.setProperty('--glare-y', `${(y * 100).toFixed(1)}%`);
  };

  const handlePointerLeave = () => {
    resetCover();
    stopTrailer();
  };

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      window.clearTimeout(viewTimerRef.current);
    },
    [],
  );

  return (
    <Link
      className={['app-card', animated ? 'app-card--animated' : ''].filter(Boolean).join(' ')}
      to={`/app/${encodeURIComponent(app.id)}`}
      data-id="AppCard"
      data-gamepad-focusable
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <span ref={coverRef} className="app-card__cover">
        {cover ? (
          <img src={cover} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className="app-card__cover-fallback">{app.name.charAt(0)}</span>
        )}
        {isTrailerMounted && app.trailer ? (
          <video
            className={['app-card__trailer', isTrailerPlaying ? 'app-card__trailer--playing' : ''].filter(Boolean).join(' ')}
            src={app.trailer}
            preload="auto"
            autoPlay
            muted
            playsInline
            onLoadedMetadata={handleTrailerMetadata}
            onPlaying={() => {
              if (!isTrailerPlaying) {
                // Started playing just now — only counts as a view once it's held that long, not on every restart of the loop.
                viewTimerRef.current = window.setTimeout(() => void reportProgress('trailer', app.id), TRAILER_VIEW_THRESHOLD_MS);
              }

              setIsTrailerPlaying(true);
            }}
            onEnded={(event) => void handleTrailerEnded(event)}
          />
        ) : null}
        <span className="app-card__glare" aria-hidden />
        {app.rating != null ? <RatingBadge rating={app.rating} className="app-card__rating" /> : null}
        {criticalHealth ? (
          <Tooltip label={healthWarning}>
            <span className="app-card__health" aria-label={healthWarning}>
              <TriangleAlert size={12} />
            </span>
          </Tooltip>
        ) : null}
      </span>
      <span className="app-card__name">{app.name}</span>
    </Link>
  );
};
