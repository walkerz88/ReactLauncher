import type { FC } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { useRunningGamesSync } from '@/app/hooks/useRunningGamesSync';
import { useProgressSync } from '@/app/hooks/useProgressSync';
import { useTypedSecrets } from '@/app/hooks/useTypedSecrets';
import { useUpdateCheck } from '@/app/hooks/useUpdateCheck';
import { useProfileStore } from '@/app/store/profileStore';
import { AchievementToasts } from '@/widgets/AchievementToasts';
import { AppNavigation } from '@/widgets/AppNavigation';
import { CaptureManager } from '@/widgets/CaptureManager';
import { GamepadNavigation } from '@/widgets/GamepadNavigation';
import { NotificationToasts } from '@/widgets/NotificationToasts';
import { SplashScreen } from '@/widgets/SplashScreen';
import { ThemeEffects } from '@/widgets/ThemeEffects';
import { TitleBar } from '@/widgets/TitleBar';
import { UpdateModal } from '@/widgets/UpdateModal';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { PreviewPage } from '@/pages/PreviewPage';
import { ProfileSetupPage } from '@/pages/ProfileSetupPage';
import { SettingsPage } from '@/pages/SettingsPage';

import './App.css';

export const App: FC = () => {
  const hasProfiles = useProfileStore((state) => state.profiles.length > 0);

  useRunningGamesSync();
  useProgressSync();
  useTypedSecrets();
  useUpdateCheck();

  return (
    <HashRouter>
      <div className="app" data-id="App">
        <div className="app-background" aria-hidden="true" />
        <ThemeEffects />
        <SplashScreen />
        <GamepadNavigation />
        <AchievementToasts />
        <CaptureManager />
        <NotificationToasts />
        <UpdateModal />
        <TitleBar />
        {hasProfiles ? (
          <div className="app-body">
            <AppNavigation />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<GalleryPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/app/:id" element={<PreviewPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        ) : (
          <ProfileSetupPage />
        )}
      </div>
    </HashRouter>
  );
};
