import type { FC } from 'react';

import type { ShowcaseGame } from '@/electron';

import { ShowcaseCard } from './components/ShowcaseCard';

import './ShowcaseGrid.css';

export interface ShowcaseGridProps {
  games: ShowcaseGame[];
}

export const ShowcaseGrid: FC<ShowcaseGridProps> = ({ games }) => {
  return (
    <ul className="app-grid" data-id="ShowcaseGrid">
      {games.map((game) => (
        <li key={game.id}>
          <ShowcaseCard game={game} />
        </li>
      ))}
    </ul>
  );
};
