import type { CSSProperties, FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { buildThemeVars, type ThemeDefinition } from '@/app/lib/themes';

export interface ThemePreviewProps {
  theme: ThemeDefinition;
}

/** A miniature app screen painted with the theme's own tokens (set inline, so it doesn't depend on the active theme). */
export const ThemePreview: FC<ThemePreviewProps> = ({ theme }) => {
  const t = useTranslation();

  return (
    <div className="theme-preview" style={buildThemeVars(theme) as CSSProperties} aria-hidden data-id="ThemePreview">
      <div className="theme-preview__sidebar">
        <span className="theme-preview__dot theme-preview__dot--active" />
        <span className="theme-preview__dot" />
        <span className="theme-preview__dot" />
      </div>

      <div className="theme-preview__main">
        <span className="theme-preview__title">{t('themeEditor.previewTitle')}</span>

        <div className="theme-preview__cards">
          <div className="theme-preview__card">
            <span className="theme-preview__muted">{t('themeEditor.previewMuted')}</span>
          </div>
          <div className="theme-preview__card">
            <span className="theme-preview__muted">{t('themeEditor.previewMuted')}</span>
          </div>
        </div>

        <span className="theme-preview__button">{t('app.play')}</span>
      </div>
    </div>
  );
};
