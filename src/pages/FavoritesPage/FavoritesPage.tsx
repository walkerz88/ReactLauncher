import { useEffect, type FC } from 'react';

import { useContentStore } from '@/app/store/contentStore';
import { useFavoritesStore } from '@/app/store/favoritesStore';
import { useTranslation } from '@/app/i18n';
import { AppCollection } from '@/widgets/AppCollection';

import './FavoritesPage.css';

export const FavoritesPage: FC = () => {
  const t = useTranslation();
  const apps = useContentStore((state) => state.apps);
  const status = useContentStore((state) => state.status);
  const error = useContentStore((state) => state.error);
  const loadApps = useContentStore((state) => state.loadApps);
  const favoriteIds = useFavoritesStore((state) => state.ids);

  useEffect(() => {
    if (status === 'idle') {
      void loadApps();
    }
  }, [status, loadApps]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="page page--scroll-pad" data-id="FavoritesPage">
        <p className="home-hint">{t('home.scanning')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page page--scroll-pad" data-id="FavoritesPage">
        <p className="home-hint home-hint--error">{error}</p>
      </div>
    );
  }

  const favorites = apps.filter((app) => favoriteIds.includes(app.id));

  if (favorites.length === 0) {
    return (
      <div className="page page--scroll-pad" data-id="FavoritesPage">
        <h1 className="home-section__title">{t('favorites.title')}</h1>
        <p className="home-hint">{t('favorites.empty')}</p>
      </div>
    );
  }

  return (
    <div className="page page--scroll-pad" data-id="FavoritesPage">
      <AppCollection apps={favorites} title={t('favorites.title')} contextKey="favorites" />
    </div>
  );
};
