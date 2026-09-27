import type { FC, ReactNode } from 'react';

export interface StatTileProps {
  icon: ReactNode;
  value: string;
  label: string;
}

export const StatTile: FC<StatTileProps> = ({ icon, value, label }) => (
  <div className="stat-tile" data-id="StatTile">
    <span className="stat-tile__icon" aria-hidden>
      {icon}
    </span>
    <span className="stat-tile__text">
      <span className="stat-tile__value">{value}</span>
      <span className="stat-tile__label">{label}</span>
    </span>
  </div>
);
