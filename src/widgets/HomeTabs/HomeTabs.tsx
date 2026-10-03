import type { FC } from 'react';
import { X } from 'lucide-react';

import { isReadyToLaunch } from '@/app/lib/readyToLaunch';
import { useContentStore } from '@/app/store/contentStore';
import { useRecentStore } from '@/app/store/recentStore';
import { useSectionsStore } from '@/app/store/sectionsStore';
import { useTranslation } from '@/app/i18n';
import { Tooltip } from '@/shared/Tooltip';

import './HomeTabs.css';

export type HomeTab = 'gallery' | 'recent' | 'ready' | 'lucky';

export interface HomeTabsProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
}

/**
 * Tab switcher between the "Recently launched", "Gallery", "Ready to launch" and "Feeling Lucky" views on the
 * home page (all but the gallery only while enabled in Settings, "Ready to launch" only while at least one game qualifies). Local UI state, not routing — both views live under "/", so the
 * sidebar's "Главная" stays highlighted no matter which tab is active.
 * The "Recently launched" tab only shows once something has actually been
 * launched, with a small "clear" icon that empties the list (and hides the
 * tab itself again once it's empty).
 */
export const HomeTabs: FC<HomeTabsProps> = ({ activeTab, onTabChange }) => {
  const t = useTranslation();
  const hasRecent = useRecentStore((state) => state.ids.length > 0);
  const clearRecent = useRecentStore((state) => state.clear);
  const luckyEnabled = useSectionsStore((state) => state.luckyEnabled);
  const readyEnabled = useSectionsStore((state) => state.readyEnabled);
  const recentEnabled = useSectionsStore((state) => state.recentEnabled);
  const hasReady = useContentStore((state) => state.apps.some(isReadyToLaunch));

  const handleClearRecent = () => {
    clearRecent();
    // The tab disappears once the list is empty — fall back to Gallery
    // rather than leaving the user on a tab that no longer exists.
    onTabChange('gallery');
  };

  return (
    <nav className="home-tabs" data-id="HomeTabs">
      {hasRecent && recentEnabled ? (
        <span className="home-tabs__tab">
          <button
            type="button"
            className={`home-tabs__item${activeTab === 'recent' ? ' active' : ''}`}
            aria-pressed={activeTab === 'recent'}
            onClick={() => onTabChange('recent')}
            data-gamepad-focusable
          >
            {t('home.tabs.recent')}
          </button>
          <Tooltip label={t('recent.clear')}>
            <button
              type="button"
              className="home-tabs__clear"
              onClick={handleClearRecent}
              aria-label={t('recent.clear')}
              data-gamepad-focusable
            >
              <X size={13} />
            </button>
          </Tooltip>
        </span>
      ) : null}

      <button
        type="button"
        className={`home-tabs__item${activeTab === 'gallery' ? ' active' : ''}`}
        aria-pressed={activeTab === 'gallery'}
        onClick={() => onTabChange('gallery')}
        data-gamepad-focusable
      >
        {t('home.tabs.gallery')}
      </button>

      {readyEnabled && hasReady ? (
        <button
          type="button"
          className={`home-tabs__item${activeTab === 'ready' ? ' active' : ''}`}
          aria-pressed={activeTab === 'ready'}
          onClick={() => onTabChange('ready')}
          data-gamepad-focusable
        >
          {t('home.tabs.ready')}
        </button>
      ) : null}

      {luckyEnabled ? (
        <button
          type="button"
          className={`home-tabs__item${activeTab === 'lucky' ? ' active' : ''}`}
          aria-pressed={activeTab === 'lucky'}
          onClick={() => onTabChange('lucky')}
          data-gamepad-focusable
        >
          {t('nav.lucky')}
        </button>
      ) : null}
    </nav>
  );
};
