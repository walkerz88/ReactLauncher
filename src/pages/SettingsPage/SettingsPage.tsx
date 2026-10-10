import type { FC } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useTranslation } from '@/app/i18n';
import { AboutSection } from '@/features/AboutSection';
import { ThemePicker } from '@/features/ThemePicker';
import { AddGameSectionToggle } from '@/features/AddGameSectionToggle';
import { AchievementSoundToggle } from '@/features/AchievementSoundToggle';
import { CardsSettings } from '@/features/CardsSettings';
import { LaunchSettings } from '@/features/LaunchSettings';
import { LanguageToggle } from '@/features/LanguageToggle';
import { LibraryHealth } from '@/features/LibraryHealth';
import { FavoritesSectionToggle } from '@/features/FavoritesSectionToggle';
import { ProfileManager } from '@/features/ProfileManager';
import { RecordingSoundToggle } from '@/features/RecordingSoundToggle';
import { ScreenshotSoundToggle } from '@/features/ScreenshotSoundToggle';
import { RecordingQuality } from '@/features/RecordingQuality';
import { RecentSectionToggle } from '@/features/RecentSectionToggle';
import { ReadySectionToggle } from '@/features/ReadySectionToggle';
import { LuckySectionToggle } from '@/features/LuckySectionToggle';
import { UniqueThemes } from '@/features/UniqueThemes';
import { WelcomeAnimationStyle } from '@/features/WelcomeAnimationStyle';
import { WelcomeAnimationToggle } from '@/features/WelcomeAnimationToggle';
import { Tabs, type TabItem } from '@/shared/Tabs';

import './SettingsPage.css';

type SettingsTab = 'general' | 'themes' | 'profiles' | 'library' | 'about';

const TAB_PARAMS: readonly SettingsTab[] = ['themes', 'profiles', 'library', 'about'];

export const SettingsPage: FC = () => {
  const t = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab: SettingsTab = TAB_PARAMS.find((candidate) => candidate === requestedTab) ?? 'general';

  // The tab lives in the URL (replacing the entry, not pushing one) so going back from a game opened
  // out of a tab lands on that tab again instead of resetting to "general".
  const setTab = (next: SettingsTab) => {
    setSearchParams(next === 'general' ? {} : { tab: next }, { replace: true });
  };

  const tabs: TabItem<SettingsTab>[] = [
    { id: 'general', label: t('settings.tabGeneral') },
    { id: 'themes', label: t('settings.tabThemes') },
    { id: 'profiles', label: t('settings.profiles') },
    { id: 'library', label: t('settings.tabLibrary') },
    { id: 'about', label: t('settings.tabAbout') },
  ];

  return (
    <div className="page page--scroll-pad" data-id="SettingsPage">
      <h1 className="home-section__title">{t('settings.title')}</h1>

      <Tabs tabs={tabs} activeTab={tab} ariaLabel={t('settings.title')} onChange={setTab} />

      {tab === 'themes' ? (
        <>
          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.welcome')}</h2>
            <WelcomeAnimationToggle />
            <WelcomeAnimationStyle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.theme')}</h2>
            <ThemePicker />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.uniqueThemes')}</h2>
            <UniqueThemes />
          </section>
        </>
      ) : tab === 'profiles' ? (
        <ProfileManager />
      ) : tab === 'library' ? (
        <LibraryHealth />
      ) : tab === 'about' ? (
        <AboutSection />
      ) : (
        <>
          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.language')}</h2>
            <LanguageToggle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.launch')}</h2>
            <LaunchSettings />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.cards')}</h2>
            <CardsSettings />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.sections')}</h2>
            <RecentSectionToggle />
            <ReadySectionToggle />
            <LuckySectionToggle />
            <FavoritesSectionToggle />
            <AddGameSectionToggle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.notifications')}</h2>
            <AchievementSoundToggle />
            <ScreenshotSoundToggle />
            <RecordingSoundToggle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.recording')}</h2>
            <RecordingQuality />
          </section>
        </>
      )}
    </div>
  );
};
