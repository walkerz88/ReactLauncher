import { useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useTranslation } from '@/app/i18n';
import { AboutSection } from '@/features/AboutSection';
import { ThemePicker } from '@/features/ThemePicker';
import { AchievementSoundToggle } from '@/features/AchievementSoundToggle';
import { CardsSettings } from '@/features/CardsSettings';
import { LanguageToggle } from '@/features/LanguageToggle';
import { LibraryHealth } from '@/features/LibraryHealth';
import { ProfileManager } from '@/features/ProfileManager';
import { LuckySectionToggle } from '@/features/LuckySectionToggle';
import { WelcomeAnimationStyle } from '@/features/WelcomeAnimationStyle';
import { WelcomeAnimationToggle } from '@/features/WelcomeAnimationToggle';
import { Tabs, type TabItem } from '@/shared/Tabs';

import './SettingsPage.css';

type SettingsTab = 'general' | 'profiles' | 'library';

const TAB_PARAMS: readonly SettingsTab[] = ['profiles', 'library'];

export const SettingsPage: FC = () => {
  const t = useTranslation();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState<SettingsTab>(
    TAB_PARAMS.find((candidate) => candidate === requestedTab) ?? 'general',
  );

  const tabs: TabItem<SettingsTab>[] = [
    { id: 'general', label: t('settings.tabGeneral') },
    { id: 'profiles', label: t('settings.profiles') },
    { id: 'library', label: t('settings.tabLibrary') },
  ];

  return (
    <div className="page page--scroll-pad" data-id="SettingsPage">
      <h1 className="home-section__title">{t('settings.title')}</h1>

      <Tabs tabs={tabs} activeTab={tab} ariaLabel={t('settings.title')} onChange={setTab} />

      {tab === 'profiles' ? (
        <ProfileManager />
      ) : tab === 'library' ? (
        <LibraryHealth />
      ) : (
        <>
          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.language')}</h2>
            <LanguageToggle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.theme')}</h2>
            <ThemePicker />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.appearance')}</h2>
            <WelcomeAnimationToggle />
            <WelcomeAnimationStyle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.cards')}</h2>
            <CardsSettings />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.sections')}</h2>
            <LuckySectionToggle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.notifications')}</h2>
            <AchievementSoundToggle />
          </section>

          <section className="settings-section">
            <h2 className="settings-section__title">{t('settings.about')}</h2>
            <AboutSection />
          </section>
        </>
      )}
    </div>
  );
};
