import { useMemo, type FC } from 'react';

import { formatIsoDate } from '@/app/lib/format';
import { Tooltip } from '@/shared/Tooltip';

import type { CalendarDay } from '../useStatsData';

export interface ActivityCalendarProps {
  /** Sparse — only days with play time. The last ~53 weeks are filled in around it, GitHub-style. */
  days: CalendarDay[];
  emptyLabel: string;
  formatValue: (seconds: number) => string;
}

const WEEKS = 53;
const DAYS_PER_WEEK = 7;
const LEVELS = 4;

const toLocalDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** A GitHub-style contribution grid: one column per week, one cell per day, shaded by play time that day. */
export const ActivityCalendar: FC<ActivityCalendarProps> = ({ days, emptyLabel, formatValue }) => {
  const { columns, max } = useMemo(() => {
    const byDay = new Map(days.map((entry) => [entry.day, entry.seconds]));
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    // The grid always ends on the current week's Saturday and covers exactly `WEEKS` weeks back from there,
    // so its shape is stable regardless of how much history the profile actually has.
    const gridEnd = new Date(today);

    gridEnd.setDate(today.getDate() + (6 - today.getDay()));

    const gridStart = new Date(gridEnd);

    gridStart.setDate(gridEnd.getDate() - (WEEKS * DAYS_PER_WEEK - 1));

    const cells: Array<{ day: string; seconds: number; future: boolean }> = [];
    let peak = 0;

    for (let i = 0; i < WEEKS * DAYS_PER_WEEK; i += 1) {
      const date = new Date(gridStart);

      date.setDate(gridStart.getDate() + i);

      const day = toLocalDay(date);
      const seconds = byDay.get(day) ?? 0;

      peak = Math.max(peak, seconds);
      cells.push({ day, seconds, future: date > today });
    }

    const weekColumns: (typeof cells)[] = [];

    for (let week = 0; week < WEEKS; week += 1) {
      weekColumns.push(cells.slice(week * DAYS_PER_WEEK, week * DAYS_PER_WEEK + DAYS_PER_WEEK));
    }

    return { columns: weekColumns, max: peak };
  }, [days]);

  if (max === 0) {
    return <p className="stats-empty">{emptyLabel}</p>;
  }

  const levelOf = (seconds: number): number => {
    if (seconds <= 0) {
      return 0;
    }

    return Math.min(LEVELS, Math.ceil((seconds / max) * LEVELS));
  };

  return (
    <div className="activity-calendar" data-id="ActivityCalendar">
      {columns.map((column) => (
        <div key={column[0]?.day} className="activity-calendar__col">
          {column.map((cell) =>
            cell.future ? (
              <span key={cell.day} className="activity-calendar__cell activity-calendar__cell--future" aria-hidden />
            ) : (
              <Tooltip
                key={cell.day}
                label={cell.seconds > 0 ? `${formatIsoDate(cell.day)} — ${formatValue(cell.seconds)}` : formatIsoDate(cell.day)}
              >
                <span className={`activity-calendar__cell activity-calendar__cell--${levelOf(cell.seconds)}`} />
              </Tooltip>
            ),
          )}
        </div>
      ))}
    </div>
  );
};
