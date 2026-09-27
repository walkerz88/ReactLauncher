import type { FC } from 'react';

import type { StatRow } from '../useStatsData';

export interface FavoriteGamesProps {
  week: StatRow | null;
  month: StatRow | null;
  year: StatRow | null;
  periodLabels: { week: string; month: string; year: string };
  emptyGameLabel: string;
  formatValue: (seconds: number) => string;
}

/** The most-played game of the current week/month/year — name + time in it. */
export const FavoriteGames: FC<FavoriteGamesProps> = ({ week, month, year, periodLabels, emptyGameLabel, formatValue }) => {
  const items: Array<{ key: string; period: string; game: StatRow | null }> = [
    { key: 'week', period: periodLabels.week, game: week },
    { key: 'month', period: periodLabels.month, game: month },
    { key: 'year', period: periodLabels.year, game: year },
  ];

  return (
    <ul className="favorite-games" data-id="FavoriteGames">
      {items.map(({ key, period, game }) => (
        <li key={key} className="favorite-games__item">
          <span className="favorite-games__period">{period}</span>
          <span className="favorite-games__name">{game?.label ?? emptyGameLabel}</span>
          {game ? <span className="favorite-games__time">{formatValue(game.seconds)}</span> : null}
        </li>
      ))}
    </ul>
  );
};
