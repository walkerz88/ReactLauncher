import type { FC } from 'react';

import './CardSkeleton.css';

export const CardSkeleton: FC = () => {
  return (
    <div className="app-card" data-id="CardSkeleton">
      <span className="app-card__cover card-skeleton" />
      <span className="app-card__name card-skeleton card-skeleton--text" />
    </div>
  );
};
