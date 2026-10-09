import { useEffect, useState, type FC } from 'react';

import type { LaunchSettings as LaunchSettingsValue } from '@/electron';
import { useTranslation } from '@/app/i18n';
import { SwitchField } from '@/shared/SwitchField';

export const LaunchSettings: FC = () => {
  const t = useTranslation();
  const [settings, setSettings] = useState<LaunchSettingsValue | null>(null);

  const update = async (patch: Partial<LaunchSettingsValue>) => {
    try {
      const next = await window.electronAPI?.settings.set(patch);

      if (next) {
        setSettings(next);
      }
    } catch (err) {
      console.error('Saving the launch settings failed:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setSettings((await window.electronAPI?.settings.get()) ?? null);
      } catch (err) {
        console.error('Loading the launch settings failed:', err);
      }
    };

    void load();
  }, []);

  if (!settings) {
    return null;
  }

  return (
    <div data-id="LaunchSettings">
      <SwitchField
        label={t('settings.launchFullscreen')}
        checked={settings.launchFullscreen}
        onChange={(launchFullscreen) => void update({ launchFullscreen })}
      />
      <SwitchField
        label={t('settings.launchAtLogin')}
        checked={settings.launchAtLogin}
        onChange={(launchAtLogin) => void update({ launchAtLogin })}
      />
    </div>
  );
};
