import type { FC } from 'react';
import type { TooltipContentProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import './ChartTooltip.css';

export interface ChartTooltipProps extends TooltipContentProps<ValueType, NameType> {
  formatValue: (value: number) => string;
}

/** Recharts' tooltip content, restyled to the app's own surface/border/text tokens instead of the library default. */
export const ChartTooltip: FC<ChartTooltipProps> = ({ active, payload, formatValue }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      {payload.map((entry, index) => (
        <div key={String(entry.name ?? index)} className="chart-tooltip__row">
          {entry.color ? <span className="chart-tooltip__swatch" style={{ backgroundColor: entry.color }} /> : null}
          {/* `entry.payload.label` is the row's own display name; `entry.name` falls back to Recharts' default
              (the dataKey, e.g. "value") when a chart doesn't set an explicit `name` on its `<Bar>`. */}
          <span className="chart-tooltip__label">{entry.payload?.label ?? entry.name}</span>
          <span className="chart-tooltip__value">{formatValue(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
};
