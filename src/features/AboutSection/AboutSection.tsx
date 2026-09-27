import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';

import './AboutSection.css';

const APP_NAME = process.env.REACT_APP_PRODUCT_NAME ?? '';
const APP_VERSION = process.env.REACT_APP_VERSION ?? '';
const AUTHOR_NAME = process.env.REACT_APP_AUTHOR_NAME ?? '';
const AUTHOR_URL = process.env.REACT_APP_AUTHOR_URL ?? '';

export const AboutSection: FC = () => {
  const t = useTranslation();

  const handleOpenWebsite = async () => {
    try {
      await window.electronAPI.openExternal(AUTHOR_URL);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <dl className="about-section" data-id="AboutSection">
      <div className="about-section__row">
        <dt>{APP_NAME}</dt>
        <dd>{t('settings.about.version').replace('{version}', APP_VERSION)}</dd>
      </div>

      <div className="about-section__row">
        <dt>{t('settings.about.author')}</dt>
        <dd>{AUTHOR_NAME}</dd>
      </div>

      <div className="about-section__row">
        <dt>{t('settings.about.website')}</dt>
        <dd>
          <button type="button" className="about-section__link" onClick={handleOpenWebsite}>
            {AUTHOR_URL}
          </button>
        </dd>
      </div>
    </dl>
  );
};
