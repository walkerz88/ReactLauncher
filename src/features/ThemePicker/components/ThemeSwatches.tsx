import type { FC } from 'react';

import { COLOR_FIELDS, type ThemeDefinition } from '@/app/lib/themes';

export interface ThemeSwatchesProps {
  theme: ThemeDefinition;
}

/** The theme's four base colors (background, surface, text, accent) as a row of small squares. */
export const ThemeSwatches: FC<ThemeSwatchesProps> = ({ theme }) => (
  <div className="theme-swatches" aria-hidden data-id="ThemeSwatches">
    {COLOR_FIELDS.map((field) => (
      <span key={field} className="theme-swatches__square" style={{ backgroundColor: theme.colors[field] }} />
    ))}
  </div>
);
