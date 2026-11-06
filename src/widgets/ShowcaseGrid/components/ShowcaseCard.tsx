import { useEffect, useRef, type FC, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';

import { useCardsStore } from '@/app/store/cardsStore';
import type { ShowcaseGame } from '@/electron';
import { RatingBadge } from '@/shared/RatingBadge';

export interface ShowcaseCardProps {
  game: ShowcaseGame;
}

const MAX_TILT_DEG = 7;
const MAX_SHIFT_PX = 8;

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Showcase card: cover tilts toward the cursor with a glare (like AppCard), but no trailer preview. */
export const ShowcaseCard: FC<ShowcaseCardProps> = ({ game }) => {
  const coverRef = useRef<HTMLSpanElement>(null);
  const animated = useCardsStore((state) => state.animateOnHover);

  const cover = game.coverVertical ?? game.coverHorizontal;

  const resetCover = () => {
    const element = coverRef.current;

    if (!element) {
      return;
    }

    ['--tilt-x', '--tilt-y', '--shift-x', '--shift-y', '--glare-x', '--glare-y'].forEach((name) =>
      element.style.removeProperty(name),
    );
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
  };

  useEffect(
    () => () => {
      resetCover();
    },
    [],
  );

  return (
    <Link
      className={['app-card', animated ? 'app-card--animated' : ''].filter(Boolean).join(' ')}
      to={`/showcase/${encodeURIComponent(game.id)}`}
      data-id="ShowcaseCard"
      data-gamepad-focusable
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <span ref={coverRef} className="app-card__cover">
        {cover ? (
          <img src={cover} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className="app-card__cover-fallback">{game.name.charAt(0)}</span>
        )}
        <span className="app-card__glare" aria-hidden />
        {game.rating != null ? <RatingBadge rating={game.rating} className="app-card__rating" /> : null}
      </span>
      <span className="app-card__name">{game.name}</span>
    </Link>
  );
};
