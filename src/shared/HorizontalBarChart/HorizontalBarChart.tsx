import type { FC } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartTooltip } from '@/shared/ChartTooltip';

import './HorizontalBarChart.css';

export interface HorizontalBarChartRow {
  key: string;
  label: string;
  value: number;
  /** Small muted second line under the label (e.g. the clock range a "Утро"/"Morning" bucket covers). */
  caption?: string;
}

export interface HorizontalBarChartProps {
  rows: HorizontalBarChartRow[];
  emptyLabel: string;
  formatValue: (value: number) => string;
}

const ROW_HEIGHT = 34;
const MAX_LABEL_LENGTH = 22;

const truncate = (text: string): string => (text.length > MAX_LABEL_LENGTH ? `${text.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…` : text);

interface CategoryTickProps {
  x?: string | number;
  y?: string | number;
  payload?: { value: string };
}

/** A single-series ranking chart (magnitude, one hue — the theme's accent) — real axis and gridlines instead of a self-scaled bar. */
export const HorizontalBarChart: FC<HorizontalBarChartProps> = ({ rows, emptyLabel, formatValue }) => {
  if (rows.length === 0) {
    return <p className="horizontal-bar-chart__empty">{emptyLabel}</p>;
  }

  const hasCaptions = rows.some((row) => row.caption);

  // Replaces the default single-line tick with a label + small muted caption underneath (e.g. a clock
  // range), only reached when at least one row actually has a `caption` to show.
  const renderCategoryTick = ({ x = 0, y = 0, payload }: CategoryTickProps) => {
    const caption = rows.find((row) => row.label === payload?.value)?.caption;

    return (
      <g transform={`translate(${x},${y})`}>
        <text dy={caption ? -1 : 4} textAnchor="end" fill="var(--color-text)" fontSize={13}>
          {truncate(payload?.value ?? '')}
        </text>
        {caption ? (
          <text dy={11} textAnchor="end" fill="var(--color-text-muted)" fontSize={10}>
            {caption}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={rows.length * ROW_HEIGHT + 20}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-border)" />
        <XAxis
          type="number"
          tickFormatter={formatValue}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickFormatter={truncate}
          tick={hasCaptions ? renderCategoryTick : { fill: 'var(--color-text)', fontSize: 13 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-surface-hover)' }}
          content={(props) => <ChartTooltip {...props} formatValue={formatValue} />}
        />
        <Bar dataKey="value" name={undefined} fill="var(--color-accent)" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="value" position="right" formatter={(label) => formatValue(Number(label))} fill="var(--color-text-muted)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
