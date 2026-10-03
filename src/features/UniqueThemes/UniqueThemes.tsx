import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { UNIQUE_THEMES } from '@/app/lib/themes';
import { useThemeStore } from '@/app/store/themeStore';
import { ThemeSwatches } from '@/features/ThemePicker/components/ThemeSwatches';

import './UniqueThemes.css';

export const UniqueThemes: FC = () => {
  const t = useTranslation();
  const activeId = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div data-id="UniqueThemes">
      <p className="unique-themes__hint">{t('unique.hint')}</p>

      <ul className="theme-picker unique-themes" role="radiogroup" aria-label={t('settings.uniqueThemes')}>
        {UNIQUE_THEMES.map((theme) => (
          <li key={theme.id} className="theme-picker__item">
            <button
              type="button"
              className={`theme-picker__card unique-themes__card unique-themes__card--${theme.effect}`}
              role="radio"
              aria-checked={activeId === theme.id}
              onClick={() => setTheme(theme.id)}
              data-gamepad-focusable
            >
              <span className="unique-themes__preview" aria-hidden="true" />
              <ThemeSwatches theme={theme} />
              <span className="theme-picker__name">{theme.name}</span>
              <span className="unique-themes__desc">{t(`unique.${theme.id}.desc`)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
