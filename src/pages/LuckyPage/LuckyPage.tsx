import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { Dices, RotateCw } from 'lucide-react';

import { useContentStore } from '@/app/store/contentStore';
import { reportProgress } from '@/app/lib/progressEvents';
import { useLuckyStore } from '@/app/store/luckyStore';
import { useTranslation } from '@/app/i18n';
import { AchievementBadge } from '@/shared/AchievementBadge';
import { RatingBadge } from '@/shared/RatingBadge';
import { Tooltip } from '@/shared/Tooltip';
import type { ContentApp } from '@/electron';

import './LuckyPage.css';

const CARD_WIDTH = 170;
const CARD_GAP = 20;
const ITEM_FULL = CARD_WIDTH + CARD_GAP;

/** How many times the shuffled list is repeated to build the reel strip.
 * Needs enough headroom for the longest possible single spin (see `spin()`)
 * plus the "a couple cycles either side of center" resting look, so the reel
 * never runs out of tiles mid-animation or at rest. Every tile in the strip
 * is a live DOM node animated on every frame during a spin, so this is a
 * direct performance knob — keep it as small as the math allows. */
const STRIP_REPEATS = 14;
/** Resting/initial position, in whole cycles from the strip's start — keeps
 * a couple of tiles visible on both sides instead of starting flush at index
 * 0. Only needs to cover what's actually visible in the reel's viewport
 * (a handful of tiles), not a large buffer. */
const MID_ANCHOR_CYCLES = 2;

const MIN_LOOPS = 2;
const LOOP_JITTER = 1;
const MIN_SPIN_SECONDS = 2.5;
const MAX_SPIN_SECONDS = 3.5;
/** How long the reel shows "?" placeholders before revealing real covers —
 * just long enough for a couple of tiles to scroll past, so it reads as "the
 * reel catches up to real covers" rather than a full second of mystery cards. */
const REVEAL_DELAY_MS = 350;
/** Duration of the short "recenter" slide when clicking a neighboring tile. */
const MOVE_TO_CENTER_SECONDS = 0.5;

/** Coverflow scaling: the centered tile is largest, tiles fade down to
 * SCALE_EDGE over SCALE_FALLOFF_ITEMS tile-widths of distance. */
const SCALE_CENTER = 1.15;
const SCALE_EDGE = 0.72;
const SCALE_FALLOFF_ITEMS = 1.6;

/** Fisher-Yates shuffle — returns a new array, doesn't mutate `input`. */
function shuffle<T>(input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/** The reel order remembered from an earlier visit, if it still matches the current library. */
function restoreCycle(apps: ContentApp[]): ContentApp[] | null {
  const savedOrder = useLuckyStore.getState().order;

  if (!savedOrder || savedOrder.length !== apps.length) {
    return null;
  }

  const byId = new Map(apps.map((app) => [app.id, app]));
  const restored = savedOrder.map((id) => byId.get(id));

  return restored.every((app): app is ContentApp => app !== undefined) ? restored : null;
}

function positionForIndex(index: number, viewportWidth: number): number {
  return viewportWidth / 2 - CARD_WIDTH / 2 - index * ITEM_FULL;
}

function scaleForDistance(distanceInItems: number): number {
  const t = Math.min(distanceInItems / SCALE_FALLOFF_ITEMS, 1);

  return SCALE_CENTER - t * (SCALE_CENTER - SCALE_EDGE);
}

interface ReelTileProps {
  app: ContentApp;
  index: number;
  x: MotionValue<number>;
  viewportWidth: number;
  revealed: boolean;
  /** Static stacking order (see call site) — deliberately NOT frame-driven:
   * `z-index` isn't a compositor-only property like `transform`/`opacity`,
   * so writing it every animation frame forces the browser to recompute
   * paint order on every tile, every frame — a real source of jank with
   * hundreds of tiles on screen. It only needs to be "roughly right" at
   * rest anyway (fast-moving overlap mid-spin isn't perceptible). */
  zIndex: number;
  onClick: () => void;
}

/** One reel tile — subscribes directly to the shared `x` motion value so its
 * scale/opacity update every animation frame without re-rendering the whole
 * page (module-scope component: keeps its identity across renders). */
const ReelTile: FC<ReelTileProps> = ({ app, index, x, viewportWidth, revealed, zIndex, onClick }) => {
  const distanceItems = useTransform(x, (latest) => {
    if (!viewportWidth) {
      return 0;
    }
    const tileCenter = latest + index * ITEM_FULL + CARD_WIDTH / 2;

    return Math.abs(tileCenter - viewportWidth / 2) / ITEM_FULL;
  });
  const scale = useTransform(distanceItems, (distance) => scaleForDistance(distance));
  const opacity = useTransform(distanceItems, (distance) => 1 - Math.min(distance / 3, 1) * 0.3);

  const cover = app.coverVertical ?? app.coverHorizontal;

  return (
    <motion.div
      className="lucky-reel__item"
      style={{ width: CARD_WIDTH, scale, opacity, zIndex }}
      onClick={onClick}
      data-id="ReelTile"
    >
      <span className="app-card__cover">
        {revealed ? (
          cover ? (
            <img
              className="lucky-reel__cover-reveal"
              src={cover}
              alt=""
              draggable={false}
              decoding="async"
            />
          ) : (
            <span className="app-card__cover-fallback lucky-reel__cover-reveal">
              {app.name.charAt(0)}
            </span>
          )
        ) : (
          <span className="app-card__cover-fallback">?</span>
        )}
      </span>
    </motion.div>
  );
};

export const LuckyPage: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const apps = useContentStore((state) => state.apps);
  const status = useContentStore((state) => state.status);
  const error = useContentStore((state) => state.error);
  const loadApps = useContentStore((state) => state.loadApps);

  // Reel state remembered from the previous visit (e.g. before opening an app page).
  const [restored] = useState(() => {
    const saved = useLuckyStore.getState();
    const restoredCycle = restoreCycle(useContentStore.getState().apps);

    if (!restoredCycle || saved.centerIndex === null) {
      return null;
    }

    return {
      centerIndex: saved.centerIndex,
      revealed: saved.revealed,
      winner: restoredCycle.find((app) => app.id === saved.winnerId) ?? null,
    };
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const centerIndexRef = useRef(restored?.centerIndex ?? 0);
  const initializedRef = useRef(restored !== null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [centerIndex, setCenterIndex] = useState(restored?.centerIndex ?? 0);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(restored?.revealed ?? false);
  const [winner, setWinner] = useState<ContentApp | null>(restored?.winner ?? null);

  useEffect(() => {
    if (status === 'idle') {
      void loadApps();
    }
  }, [status, loadApps]);

  // Shuffled once per load — the reel strip repeats this order.
  const cycle = useMemo(() => restoreCycle(apps) ?? shuffle(apps), [apps]);
  const stripItems = useMemo(
    () => Array.from({ length: STRIP_REPEATS }, () => cycle).flat(),
    [cycle],
  );

  // Remember the reel order; a different order (first visit, library changed) starts the saved state over.
  // Declared before the layout effect below so its centering isn't wiped by this reset.
  useLayoutEffect(() => {
    const ids = cycle.map((app) => app.id);
    const savedOrder = useLuckyStore.getState().order;

    if (ids.length > 0 && (savedOrder?.length !== ids.length || ids.some((id, i) => id !== savedOrder[i]))) {
      useLuckyStore.getState().resetFor(ids);
    }
  }, [cycle]);

  // Track the reel's own width so tile positions/scale stay correct across resizes.
  // Layout effect: runs before paint, so the very first frame is already measured
  // instead of briefly painting at width 0.
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (viewportRef.current) {
        setViewportWidth(viewportRef.current.getBoundingClientRect().width);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, [status]);

  // Start resting a few cycles into the strip, once, so both sides of the
  // reel already show tiles instead of starting flush against the left edge.
  // Layout effect: must land before paint, together with the width above,
  // so the reel never flashes its un-centered index-0 arrangement first.
  useLayoutEffect(() => {
    if (initializedRef.current || cycle.length === 0) {
      return;
    }
    initializedRef.current = true;
    const midAnchorIndex = MID_ANCHOR_CYCLES * cycle.length;
    centerIndexRef.current = midAnchorIndex;
    setCenterIndex(midAnchorIndex);
    useLuckyStore.getState().save({ centerIndex: midAnchorIndex });
  }, [cycle.length]);

  // Keeps `x` in sync with `centerIndex`/`viewportWidth` any time neither is
  // actively animating — covers the initial center, post-spin wrap, and resize.
  useLayoutEffect(() => {
    if (spinning || cycle.length === 0 || viewportWidth === 0) {
      return;
    }
    x.set(positionForIndex(centerIndex, viewportWidth));
  }, [centerIndex, viewportWidth, cycle.length, spinning, x]);

  useEffect(
    () => () => {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    },
    [],
  );

  const updateCenterIndex = (value: number) => {
    centerIndexRef.current = value;
    setCenterIndex(value);
    useLuckyStore.getState().save({ centerIndex: value });
  };

  const spin = () => {
    if (spinning || cycle.length === 0 || viewportWidth === 0) {
      return;
    }

    const winnerApp = cycle[Math.floor(Math.random() * cycle.length)];
    const winnerCycleIndex = cycle.findIndex((app) => app.id === winnerApp.id);
    const loops = MIN_LOOPS + Math.floor(Math.random() * (LOOP_JITTER + 1));
    const currentCycleIndex = centerIndexRef.current % cycle.length;
    const stepsToWinner = (winnerCycleIndex - currentCycleIndex + cycle.length) % cycle.length;
    const forwardSteps = stepsToWinner + loops * cycle.length;
    const nextCenterIndex = centerIndexRef.current + forwardSteps;
    const durationSeconds = MIN_SPIN_SECONDS + Math.random() * (MAX_SPIN_SECONDS - MIN_SPIN_SECONDS);

    setSpinning(true);
    setWinner(null);
    useLuckyStore.getState().save({ winnerId: null });

    if (!revealed) {
      revealTimeoutRef.current = setTimeout(() => {
        setRevealed(true);
        useLuckyStore.getState().save({ revealed: true });
      }, REVEAL_DELAY_MS);
    }

    void animate(x, positionForIndex(nextCenterIndex, viewportWidth), {
      duration: durationSeconds,
      // Ease-in-out: quick ramp-up to speed, then a very long, gentle
      // deceleration glide into the landing tile. NB: for a cubic-bezier
      // `[x1,y1,x2,y2]` with y2=1, a SMALLER x2 means a LONGER/smoother
      // tail (it reaches near-full progress early, so most of the time is
      // spent gliding) — larger x2 actually compresses the glide into a
      // short window right at the end, which reads as an abrupt stop.
      ease: [0.16, 0, 0.1, 1],
      onComplete: () => {
        // Fold the index back near the resting anchor — every `cycle.length`-th
        // tile is identical, so the jump back is visually invisible.
        const wrappedIndex = MID_ANCHOR_CYCLES * cycle.length + (nextCenterIndex % cycle.length);
        updateCenterIndex(wrappedIndex);
        setSpinning(false);
        setWinner(winnerApp);
        useLuckyStore.getState().save({ winnerId: winnerApp.id });
      },
    });
  };

  // Slides a clicked neighboring tile into the center slot — a short, direct
  // move (no loops/randomness), only while the reel is at rest.
  const moveToCenter = (index: number, app: ContentApp) => {
    if (spinning || cycle.length === 0 || viewportWidth === 0 || index === centerIndexRef.current) {
      return;
    }

    setSpinning(true);

    void animate(x, positionForIndex(index, viewportWidth), {
      duration: MOVE_TO_CENTER_SECONDS,
      ease: [0.2, 0, 0.4, 1],
      onComplete: () => {
        // Same invisible fold-back as a full spin, so repeated clicks can't
        // walk the index out of the strip's bounds over a long session.
        const wrappedIndex = MID_ANCHOR_CYCLES * cycle.length + (index % cycle.length);
        updateCenterIndex(wrappedIndex);
        setSpinning(false);

        // Manually centering a tile "reveals" it too, same as a completed spin — otherwise the
        // name/rating next to the icon would keep showing whichever game was centered last.
        if (revealed) {
          setWinner(app);
          useLuckyStore.getState().save({ winnerId: app.id });
        }
      },
    });
  };

  const handleTileClick = (index: number, app: ContentApp) => {
    if (spinning) {
      return;
    }
    if (index === centerIndexRef.current) {
      // Only a game the reel has revealed counts: before the first spin the tiles are still hidden.
      if (revealed) {
        void reportProgress('lucky', app.id);
      }

      navigate(`/app/${encodeURIComponent(app.id)}`);
    } else {
      moveToCenter(index, app);
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="page" data-id="LuckyPage">
        <p className="home-hint">{t('home.scanning')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page" data-id="LuckyPage">
        <p className="home-hint home-hint--error">{error}</p>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="page" data-id="LuckyPage">
        <h1 className="home-section__title">{t('lucky.title')}</h1>
        <p className="home-hint">{t('lucky.empty')}</p>
      </div>
    );
  }

  return (
    <div className="page lucky-page" data-id="LuckyPage">
      <div className="lucky-page__stage">
        <div className="lucky-page__header">
          <motion.span className="lucky-page__icon" layout="position">
            <AchievementBadge icon={Dices} tier="gold" size={104} />
          </motion.span>

          {/* `popLayout`: the exiting name/rating is pulled out of flow (position: absolute) the instant
           * it starts exiting, instead of still occupying its slot until it fully unmounts — otherwise
           * the icon's own `layout` shift stays stuck until that late instant and then snaps back all
           * at once, unlike the smooth animation when the text first appears. */}
          <AnimatePresence mode="popLayout">
            {winner ? (
              <motion.div
                className="lucky-page__winner"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35, ease: [0.16, 0, 0.3, 1] }}
              >
                <span className="lucky-page__winner-name">{winner.name}</span>
                {winner.rating != null ? <RatingBadge rating={winner.rating} /> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="lucky-reel" ref={viewportRef}>
          <div className="lucky-reel__pointer" aria-hidden="true" />
          <motion.div className="lucky-reel__track" style={{ x }}>
            {stripItems.map((app, index) => (
              <ReelTile
                key={`${app.id}-${index}`}
                app={app}
                index={index}
                x={x}
                viewportWidth={viewportWidth}
                revealed={revealed}
                zIndex={1000 - Math.abs(index - centerIndex)}
                onClick={() => handleTileClick(index, app)}
              />
            ))}
          </motion.div>
        </div>

        <Tooltip label={spinning ? t('lucky.spinning') : winner ? t('lucky.spinAgain') : t('lucky.spin')} placement="bottom">
          <button
            type="button"
            className="lucky-page__spin-btn--icon"
            onClick={spin}
            disabled={spinning}
            aria-label={spinning ? t('lucky.spinning') : winner ? t('lucky.spinAgain') : t('lucky.spin')}
            aria-busy={spinning}
            data-gamepad-focusable
          >
            <RotateCw size={18} />
          </button>
        </Tooltip>

        {/* Result card + "open" link are temporarily disabled — showing/hiding this
         * block changed the centered stage's height and made the whole reel jump.
         * TODO: bring back once we have a layout that doesn't reflow the stage. */}
      </div>
    </div>
  );
};
