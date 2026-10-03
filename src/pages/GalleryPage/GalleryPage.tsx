import { useEffect, useState, type FC } from 'react';

import { isReadyToLaunch } from '@/app/lib/readyToLaunch';
import { useContentStore } from '@/app/store/contentStore';
import { useRecentStore } from '@/app/store/recentStore';
import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { LuckyPage } from '@/pages/LuckyPage';
import { AppCollection } from '@/widgets/AppCollection';
import { HomeTabs, type HomeTab } from '@/widgets/HomeTabs';

import './GalleryPage.css';

export const GalleryPage: FC = () => {
  const t = useTranslation();
  const apps = useContentStore((state) => state.apps);
  const dir = useContentStore((state) => state.dir);
  const status = useContentStore((state) => state.status);
  const error = useContentStore((state) => state.error);
  const loadApps = useContentStore((state) => state.loadApps);

  const recentIds = useRecentStore((state) => state.ids);
  const hasRecent = recentIds.length > 0;

  const luckyEnabled = useSectionsStore((state) => state.luckyEnabled);
  const readyEnabled = useSectionsStore((state) => state.readyEnabled);
  const recentEnabled = useSectionsStore((state) => state.recentEnabled);
  const readyApps = apps.filter(isReadyToLaunch);
  const hasReady = readyApps.length > 0;

  const [tab, setTab] = useState<HomeTab>('gallery');

  useEffect(() => {
    if (status === 'idle') {
      void loadApps();
    }
  }, [status, loadApps]);

  // The "Recently launched" tab disappears once the list is empty (e.g.
  // after clearing it) — fall back to Gallery instead of stranding the user
  // on a tab that no longer exists.
  useEffect(() => {
    if ((!hasRecent || !recentEnabled) && tab === 'recent') {
      setTab('gallery');
    }
  }, [hasRecent, recentEnabled, tab]);

  // Same for the "Ready to launch" tab once it is switched off or no game qualifies any more.
  useEffect(() => {
    if ((!readyEnabled || !hasReady) && tab === 'ready') {
      setTab('gallery');
    }
  }, [readyEnabled, hasReady, tab]);

  // Same for the "Feeling Lucky" tab once it is switched off in Settings.
  useEffect(() => {
    if (!luckyEnabled && tab === 'lucky') {
      setTab('gallery');
    }
  }, [luckyEnabled, tab]);

  if (status === 'idle' || (status === 'loading' && apps.length === 0)) {
    // Mirror the grid's shape while scanning, so the page doesn't jump once
    // the apps arrive. A rescan with apps already on screen skips this and
    // keeps showing them below, so the grid doesn't flash empty and back.
    return (
      <div className="page page--scroll-pad" data-id="GalleryPage">
        <HomeTabs activeTab={tab} onTabChange={setTab} />
        <section className="home-section">
          <h1 className="home-section__title">{t('home.apps')}</h1>
          <ul className="app-grid" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <div className="app-card">
                  <span className="app-card__cover home-skeleton" />
                  <span className="app-card__name home-skeleton home-skeleton--text" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page page--scroll-pad" data-id="GalleryPage">
        <HomeTabs activeTab={tab} onTabChange={setTab} />
        <p className="home-hint home-hint--error">{error}</p>
      </div>
    );
  }

  if (tab === 'lucky') {
    return (
      <div className="page gallery-page--lucky" data-id="GalleryPage">
        <HomeTabs activeTab={tab} onTabChange={setTab} />
        <LuckyPage />
      </div>
    );
  }

  if (tab === 'ready' && hasReady) {
    return (
      <div className="page page--scroll-pad" data-id="GalleryPage">
        <HomeTabs activeTab={tab} onTabChange={setTab} />
        <AppCollection apps={readyApps} title={t('home.apps')} contextKey="ready" />
      </div>
    );
  }

  if (tab === 'recent' && recentEnabled) {
    // Keep launch order (most recent first); drop ids no longer present in `./content`.
    const recentApps = recentIds
      .map((id) => apps.find((entry) => entry.id === id))
      .filter((entry): entry is NonNullable<typeof entry> => entry != null);

    if (recentApps.length === 0) {
      return (
        <div className="page page--scroll-pad" data-id="GalleryPage">
          <HomeTabs activeTab={tab} onTabChange={setTab} />
          <h1 className="home-section__title">{t('home.apps')}</h1>
          <p className="home-hint">{t('recent.empty')}</p>
        </div>
      );
    }

    return (
      <div className="page page--scroll-pad" data-id="GalleryPage">
        <HomeTabs activeTab={tab} onTabChange={setTab} />
        <AppCollection apps={recentApps} title={t('home.apps')} contextKey="recent" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="page page--scroll-pad" data-id="GalleryPage">
        <HomeTabs activeTab={tab} onTabChange={setTab} />
        <p className="home-hint">
          {t('home.notFound')}
          <br />
          <code>{dir ?? './content'}</code>
        </p>
      </div>
    );
  }

  return (
    <div className="page page--scroll-pad" data-id="GalleryPage">
      <HomeTabs activeTab={tab} onTabChange={setTab} />
      <AppCollection apps={apps} title={t('home.apps')} contextKey="gallery" />
    </div>
  );
};
