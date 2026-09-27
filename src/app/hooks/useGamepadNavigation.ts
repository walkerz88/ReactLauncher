import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ButtonEdgeTracker,
  findNextFocusable,
  getDirectionFromAxes,
  type Rect,
} from '@/app/lib/gamepadNavigation';

const FOCUSABLE_SELECTOR = '[data-gamepad-focusable]';
const MOVE_REPEAT_MS = 200;
const BUTTON_A = 0;
const BUTTON_B = 1;
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;

/**
 * Polls connected gamepads (Xbox/PlayStation, standard mapping) each frame and
 * turns the left stick / D-pad into spatial focus movement between elements
 * marked `data-gamepad-focusable`, A into activating the focused element, and
 * B into closing the nearest open menu (via a synthetic Escape, reusing
 * whatever already listens for it) or navigating back.
 */
export const useGamepadNavigation = (): void => {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    // Focusable elements are styled with plain `:focus` (not `:focus-visible`)
    // so gamepad-driven `element.focus()` calls stay visible in Chromium (see
    // PreviewPage.css). That means a mouse click would show the same ring —
    // suppress focus-on-click here while leaving the click itself untouched.
    const handleMouseDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest(FOCUSABLE_SELECTOR)) {
        event.preventDefault();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);

    const buttonEdges = new ButtonEdgeTracker();
    let lastMoveAt = 0;
    let rafId: number;

    const moveFocus = (direction: 'up' | 'down' | 'left' | 'right') => {
      const active = document.activeElement as HTMLElement | null;
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        return;
      }

      const current = active && focusables.includes(active) ? active : focusables[0];
      if (!active || !focusables.includes(active)) {
        current.focus();

        return;
      }

      const currentRect = current.getBoundingClientRect();
      const candidateRects: Rect[] = focusables.map((el) => el.getBoundingClientRect());
      const currentIndex = focusables.indexOf(current);
      // Exclude the current element from its own candidate list by giving it
      // an unreachable rect rather than reshuffling indices.
      const nextIndex = findNextFocusable(
        currentRect,
        candidateRects.map((rect, i) => (i === currentIndex ? { top: NaN, left: NaN, right: NaN, bottom: NaN } : rect)),
        direction,
      );

      if (nextIndex != null) {
        focusables[nextIndex].focus();
      }
    };

    const tick = () => {
      const pads = navigator.getGamepads();
      const pad = pads.find((p) => p != null);

      if (pad) {
        const [x, y] = pad.axes;
        const stickDirection = getDirectionFromAxes(x ?? 0, y ?? 0);

        let dpadDirection: 'up' | 'down' | 'left' | 'right' | null = null;
        if (pad.buttons[DPAD_UP]?.pressed) {
          dpadDirection = 'up';
        } else if (pad.buttons[DPAD_DOWN]?.pressed) {
          dpadDirection = 'down';
        } else if (pad.buttons[DPAD_LEFT]?.pressed) {
          dpadDirection = 'left';
        } else if (pad.buttons[DPAD_RIGHT]?.pressed) {
          dpadDirection = 'right';
        }

        const direction = stickDirection ?? dpadDirection;
        const now = performance.now();
        if (direction && now - lastMoveAt >= MOVE_REPEAT_MS) {
          moveFocus(direction);
          lastMoveAt = now;
        } else if (!direction) {
          lastMoveAt = 0;
        }

        if (buttonEdges.wasPressed(BUTTON_A, pad.buttons[BUTTON_A]?.pressed ?? false)) {
          (document.activeElement as HTMLElement | null)?.click();
        }

        if (buttonEdges.wasPressed(BUTTON_B, pad.buttons[BUTTON_B]?.pressed ?? false)) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          navigateRef.current(-1);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      cancelAnimationFrame(rafId);
    };
  }, []);
};
