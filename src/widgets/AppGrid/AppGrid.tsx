import type { FC } from 'react';

import type { ContentApp } from '@/electron';

import { AppCard } from './components/AppCard';

import './AppGrid.css';

export interface AppGridProps {
  apps: ContentApp[];
}

export const AppGrid: FC<AppGridProps> = ({ apps }) => {
  return (
    <ul className="app-grid" data-id="AppGrid">
      {apps.map((app) => (
        <li key={app.id}>
          <AppCard app={app} />
        </li>
      ))}
    </ul>
  );
};
