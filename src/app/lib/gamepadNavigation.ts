export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const rectCenter = (rect: Rect): { x: number; y: number } => ({
  x: (rect.left + rect.right) / 2,
  y: (rect.top + rect.bottom) / 2,
});

/** Penalty weight applied to cross-axis distance when scoring candidates. */
const CROSS_AXIS_PENALTY = 2;

/**
 * Dominant-axis direction from a stick position, or null if within the deadzone.
 * Deadzone is higher than a typical analog-movement deadzone (0.15-0.25) because
 * this drives discrete menu-style focus steps, not continuous motion.
 */
export const getDirectionFromAxes = (
  x: number,
  y: number,
  deadzone = 0.35,
): Direction | null => {
  const absX = Math.abs(x);
  const absY = Math.abs(y);

  if (absX < deadzone && absY < deadzone) {
    return null;
  }

  if (absX > absY) {
    return x > 0 ? 'right' : 'left';
  }

  return y > 0 ? 'down' : 'up';
};

/**
 * Picks the best next candidate rect in `direction` from `current`, using
 * primary-axis distance as the main score and cross-axis offset as a
 * tiebreaker penalty (the same "cone" heuristic console/TV UIs use for
 * spatial focus navigation). Returns null if nothing lies in that direction.
 */
export const findNextFocusable = (
  current: Rect,
  candidates: Rect[],
  direction: Direction,
): number | null => {
  const currentCenter = rectCenter(current);

  let bestIndex: number | null = null;
  let bestScore = Infinity;

  candidates.forEach((candidate, index) => {
    const candidateCenter = rectCenter(candidate);
    const dx = candidateCenter.x - currentCenter.x;
    const dy = candidateCenter.y - currentCenter.y;

    let primaryDelta: number;
    let crossDelta: number;

    switch (direction) {
      case 'right':
        if (dx <= 0) {
          return;
        }
        primaryDelta = dx;
        crossDelta = Math.abs(dy);
        break;
      case 'left':
        if (dx >= 0) {
          return;
        }
        primaryDelta = -dx;
        crossDelta = Math.abs(dy);
        break;
      case 'down':
        if (dy <= 0) {
          return;
        }
        primaryDelta = dy;
        crossDelta = Math.abs(dx);
        break;
      case 'up':
        if (dy >= 0) {
          return;
        }
        primaryDelta = -dy;
        crossDelta = Math.abs(dx);
        break;
    }

    const score = primaryDelta + crossDelta * CROSS_AXIS_PENALTY;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
};

/**
 * Tracks per-button pressed state across frames so callers can react only on
 * the false-to-true transition (edge) instead of firing every frame a button
 * is held down.
 */
export class ButtonEdgeTracker {
  private pressed = new Set<number>();

  /** Returns true only on the frame a button transitions from up to down. */
  wasPressed(index: number, isPressed: boolean): boolean {
    const wasDown = this.pressed.has(index);
    if (isPressed) {
      this.pressed.add(index);
    } else {
      this.pressed.delete(index);
    }

    return isPressed && !wasDown;
  }
}
