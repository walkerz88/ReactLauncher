import type { FC } from 'react';

import type { MonthGenre } from '../useStatsData';

export interface GenreMonthTrendProps {
  months: MonthGenre[];
  emptyGenreLabel: string;
  translateGenre: (genreKey: string) => string;
}

/** The top genre of each of the last few months, so a shifting taste shows up at a glance. */
export const GenreMonthTrend: FC<GenreMonthTrendProps> = ({ months, emptyGenreLabel, translateGenre }) => (
  <ul className="genre-trend">
    {months.map((month) => (
      <li key={month.month} className="genre-trend__item">
        <span className="genre-trend__month">{month.label}</span>
        <span className="genre-trend__genre">{month.genre ? translateGenre(month.genre) : emptyGenreLabel}</span>
      </li>
    ))}
  </ul>
);
