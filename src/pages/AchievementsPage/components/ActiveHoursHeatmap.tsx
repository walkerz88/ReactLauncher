import type { FC } from 'react';

import { Tooltip } from '@/shared/Tooltip';

export interface ActiveHoursHeatmapProps {
  /** Length 168, index `weekday * 24 + hour` (`weekday` 0 = Sunday, matching `Date#getDay`). */
  values: number[];
  /** Sunday-first, length 7. */
  weekdayLabels: string[];
  emptyLabel: string;
  /** Turns a cell's raw launch count into the tooltip's value part, e.g. "3 запуск" — a bare number
   * there reads as meaningless. */
  formatValue: (count: number) => string;
}

const HOURS = 24;
const WEEKDAYS = 7;
const LEVELS = 4;
/** Every 3rd hour gets a tick label; the rest stay blank so the header doesn't turn into a wall of numbers. */
const HOUR_LABEL_STEP = 3;

/** A weekday × hour grid, shaded by launch count — when in the week you actually play. */
export const ActiveHoursHeatmap: FC<ActiveHoursHeatmapProps> = ({ values, weekdayLabels, emptyLabel, formatValue }) => {
  const max = Math.max(0, ...values);

  if (max === 0) {
    return <p className="stats-empty">{emptyLabel}</p>;
  }

  const levelOf = (count: number): number => {
    if (count <= 0) {
      return 0;
    }

    return Math.min(LEVELS, Math.ceil((count / max) * LEVELS));
  };

  return (
    <div className="hours-heatmap" data-id="ActiveHoursHeatmap">
      <div className="hours-heatmap__row hours-heatmap__row--header">
        <span className="hours-heatmap__row-label" aria-hidden />
        <span className="hours-heatmap__cells">
          {Array.from({ length: HOURS }, (_, hour) => (
            <span key={hour} className="hours-heatmap__hour">
              {hour % HOUR_LABEL_STEP === 0 ? hour : ''}
            </span>
          ))}
        </span>
      </div>

      {Array.from({ length: WEEKDAYS }, (_, weekday) => (
        <div key={weekday} className="hours-heatmap__row">
          <span className="hours-heatmap__row-label">{weekdayLabels[weekday]}</span>
          <span className="hours-heatmap__cells">
            {Array.from({ length: HOURS }, (_, hour) => {
              const count = values[weekday * HOURS + hour] ?? 0;

              return (
                <Tooltip key={hour} label={`${weekdayLabels[weekday]} ${hour}:00 — ${formatValue(count)}`}>
                  <span className={`hours-heatmap__cell hours-heatmap__cell--${levelOf(count)}`} />
                </Tooltip>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
};
