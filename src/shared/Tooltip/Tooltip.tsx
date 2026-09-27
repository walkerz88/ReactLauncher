import { useRef, useState, type FC, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import './Tooltip.css';

export type TooltipPlacement = 'top' | 'bottom' | 'right';

export interface TooltipProps {
  label: string;
  children: ReactNode;
  /** Defaults to above the trigger; `top` flips to `bottom` on its own if there isn't room. */
  placement?: TooltipPlacement;
}

const GAP = 8;
/** Below this much room above the trigger, `top` placement would clip against the window edge — flip. */
const MIN_TOP_ROOM = 40;
/** Keeps the bubble's centerpoint this far from the window edge it's centered along — a cheap stand-in
 * for measuring the bubble's actual (not yet rendered) size, good enough for the short labels used here. */
const EDGE_MARGIN = 60;

const clamp = (value: number, max: number): number => Math.min(Math.max(value, EDGE_MARGIN), max - EDGE_MARGIN);

/** Matches the native `title` tooltip's own delay — long enough that just passing over an element on
 * the way somewhere else doesn't pop one up. */
const SHOW_DELAY_MS = 500;

interface Position {
  top: number;
  left: number;
  placement: TooltipPlacement;
}

/** Hover/focus tooltip that replaces the native `title` attribute everywhere — same trigger, but a
 * themed, portal-rendered bubble instead of the browser's own delayed, unstyled one. Wraps its child
 * in a `display: contents` span, so it adds a hover/focus target without affecting the child's layout. */
export const Tooltip: FC<TooltipProps> = ({ label, children, placement = 'top' }) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [pos, setPos] = useState<Position | null>(null);

  const show = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // `triggerRef` itself is `display: contents` — it generates no box, so its own
      // `getBoundingClientRect()` is always all-zero. Measure the actual child element instead.
      const el = triggerRef.current?.firstElementChild;

      if (!el) {
        return;
      }

      const rect = el.getBoundingClientRect();

      if (placement === 'right') {
        setPos({
          top: clamp(rect.top + rect.height / 2, window.innerHeight),
          left: rect.right + GAP,
          placement: 'right',
        });

        return;
      }

      const resolved = placement === 'top' && rect.top < MIN_TOP_ROOM ? 'bottom' : placement;

      setPos({
        top: resolved === 'top' ? rect.top - GAP : rect.bottom + GAP,
        left: clamp(rect.left + rect.width / 2, window.innerWidth),
        placement: resolved,
      });
    }, SHOW_DELAY_MS);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setPos(null);
  };

  return (
    <span
      ref={triggerRef}
      className="tooltip-trigger"
      data-id="Tooltip"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {pos && label
        ? createPortal(
            <span
              className={`tooltip tooltip--${pos.placement}`}
              style={{ top: pos.top, left: pos.left }}
              role="tooltip"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
};
