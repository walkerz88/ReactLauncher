import { useCallback, useEffect, useRef, useState, type FC, type PointerEvent, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, FolderOpen, Play, Trash2, X } from 'lucide-react';
import { Plyr, type PlyrOptions } from 'plyr-react';

import { useTranslation } from '@/app/i18n';

import 'plyr-react/plyr.css';
import './MediaViewer.css';

const PLYR_OPTIONS: PlyrOptions = {
  autoplay: true,
  clickToPlay: true,
  keyboard: { focused: true, global: false },
  controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
};

const SWIPE_DISTANCE_PX = 60;
const WHEEL_COOLDOWN_MS = 220;

export interface MediaItem {
  type: 'image' | 'video';
  src: string;
}

export interface MediaViewerProps {
  items: MediaItem[];
  startIndex: number;
  /** Read out as the dialog's accessible name (e.g. the section title it was opened from). */
  label: string;
  /** When given, a delete button for the item currently on screen is shown in the bar. */
  onDelete?: (item: MediaItem) => void;
  deleteLabel?: string;
  /** When given, a "show in folder" button for the item currently on screen is shown in the bar. */
  onReveal?: (item: MediaItem) => void;
  revealLabel?: string;
  onClose: () => void;
}

/**
 * Full-screen viewer for a mixed set of screenshots and videos (trailer, recordings): arrows /
 * thumbnails / keyboard / wheel / swipe move between items regardless of type, so watching the
 * trailer doesn't mean leaving the screenshot gallery first.
 */
export const MediaViewer: FC<MediaViewerProps> = ({
  items,
  startIndex,
  label,
  onDelete,
  deleteLabel,
  onReveal,
  revealLabel,
  onClose,
}) => {
  const t = useTranslation();
  const [index, setIndex] = useState(startIndex);

  const rootRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const swipeStartRef = useRef<number | null>(null);
  const lastWheelRef = useRef(0);
  const count = items.length;
  const active = items[index];

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // `preventScroll` on both ends — the viewer is a fixed full-screen overlay, so the underlying
    // page never needs to scroll to "reveal" the root or the opener; without it, the browser's
    // default focus behavior visibly jerks the page's own scroll position on open and close.
    rootRef.current?.focus({ preventScroll: true });

    return () => opener?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        goTo(index - 1);
      } else if (event.key === 'ArrowRight') {
        goTo(index + 1);
      } else if (event.key === 'Home') {
        goTo(0);
      } else if (event.key === 'End') {
        goTo(count - 1);
      } else {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [index, count, goTo, onClose]);

  useEffect(() => {
    // Only images are worth prefetching — a neighboring video buffers on demand once played.
    [index - 1, index + 1].forEach((neighbor) => {
      const item = items[((neighbor % count) + count) % count];

      if (item?.type === 'image') {
        new Image().src = item.src;
      }
    });
  }, [index, count, items]);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  const handleWheel = (event: WheelEvent) => {
    const now = Date.now();

    if (Math.abs(event.deltaY) < 8 || now - lastWheelRef.current < WHEEL_COOLDOWN_MS) {
      return;
    }

    lastWheelRef.current = now;
    goTo(index + (event.deltaY > 0 ? 1 : -1));
  };

  const handlePointerDown = (event: PointerEvent) => {
    swipeStartRef.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent) => {
    const start = swipeStartRef.current;

    swipeStartRef.current = null;

    if (start === null) {
      return;
    }

    const distance = event.clientX - start;

    if (Math.abs(distance) >= SWIPE_DISTANCE_PX) {
      goTo(index + (distance < 0 ? 1 : -1));
    }
  };

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  if (!active) {
    return null;
  }

  return createPortal(
    <div
      ref={rootRef}
      className="media-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      data-id="MediaViewer"
      onClick={onClose}
      onWheel={handleWheel}
    >
      <div className="media-viewer__bar" onClick={stop}>
        <span className="media-viewer__counter">
          {index + 1} {t('app.screenshotCounter')} {count}
        </span>
        <div className="media-viewer__bar-actions">
          {onReveal ? (
            <button
              type="button"
              className="media-viewer__button"
              aria-label={revealLabel}
              onClick={() => onReveal(active)}
              data-gamepad-focusable
            >
              <FolderOpen size={18} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="media-viewer__button"
              aria-label={deleteLabel}
              onClick={() => onDelete(active)}
              data-gamepad-focusable
            >
              <Trash2 size={18} />
            </button>
          ) : null}
          <button type="button" className="media-viewer__button" aria-label={t('modal.close')} onClick={onClose} data-gamepad-focusable>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="media-viewer__stage">
        {count > 1 ? (
          <button
            type="button"
            className="media-viewer__arrow media-viewer__arrow--prev"
            aria-label={t('app.previous')}
            onClick={(event) => {
              stop(event);
              goTo(index - 1);
            }}
            data-gamepad-focusable
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}

        {active.type === 'video' ? (
          <div key={active.src} className="media-viewer__player" onClick={stop}>
            <Plyr source={{ type: 'video', sources: [{ src: active.src }] }} options={PLYR_OPTIONS} />
          </div>
        ) : (
          <img
            key={active.src}
            className="media-viewer__media"
            src={active.src}
            alt=""
            draggable={false}
            onClick={stop}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          />
        )}

        {count > 1 ? (
          <button
            type="button"
            className="media-viewer__arrow media-viewer__arrow--next"
            aria-label={t('app.next')}
            onClick={(event) => {
              stop(event);
              goTo(index + 1);
            }}
            data-gamepad-focusable
          >
            <ChevronRight size={20} />
          </button>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="media-viewer__thumbs" onClick={stop}>
          {items.map((item, thumbIndex) => (
            <button
              key={item.src}
              ref={thumbIndex === index ? activeThumbRef : undefined}
              type="button"
              className={`media-viewer__thumb${thumbIndex === index ? ' media-viewer__thumb--active' : ''}`}
              aria-label={`${thumbIndex + 1} ${t('app.screenshotCounter')} ${count}`}
              aria-current={thumbIndex === index}
              onClick={() => goTo(thumbIndex)}
              data-gamepad-focusable
            >
              {item.type === 'video' ? (
                <>
                  <video src={item.src} muted preload="metadata" />
                  <span className="media-viewer__thumb-play" aria-hidden="true">
                    <Play size={18} fill="currentColor" />
                  </span>
                </>
              ) : (
                <img src={item.src} alt="" loading="lazy" decoding="async" draggable={false} />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
};
