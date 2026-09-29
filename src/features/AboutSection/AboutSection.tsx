import type { FC } from 'react';
import { Globe, Link2, Tag, User } from 'lucide-react';

import { useTranslation } from '@/app/i18n';

import { AboutFactRow } from './components/AboutFactRow';

import './AboutSection.css';

const ORIGINAL_AUTHOR = 'Alexander Anikin';
const ORIGINAL_AUTHOR_URL = 'https://walkerz.ru';
const ORIGINAL_PROJECT_SITE = 'https://rl.walkerz.ru';
const ORIGINAL_REPOSITORY_URL = 'https://github.com/walkerz88/ReactLauncher';

const APP_NAME = process.env.REACT_APP_PRODUCT_NAME ?? '';
const BUILD_VERSION = process.env.REACT_APP_VERSION ?? '';
const BUILD_AUTHOR = process.env.REACT_APP_AUTHOR_NAME ?? '';
const BUILD_AUTHOR_URL = process.env.REACT_APP_AUTHOR_URL ?? '';
const BUILD_PROJECT_SITE = process.env.REACT_APP_PROJECT_SITE ?? '';
const BUILD_REPOSITORY_URL = process.env.REACT_APP_REPOSITORY_URL ?? '';

const stripProtocol = (url: string): string => url.replace(/^https?:\/\//, '');

export const AboutSection: FC = () => {
  const t = useTranslation();

  const handleOpen = async (url: string) => {
    try {
      await window.electronAPI.openExternal(url);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="about-section__page" data-id="AboutSection">
      <div className="about-section__hero">
        <img src={`${process.env.PUBLIC_URL}/assets/icon.png`} alt="" className="about-section__logo" />
        <div>
          <div className="about-section__app-name">{APP_NAME}</div>
          <div className="about-section__app-version">{t('settings.about.version')} {BUILD_VERSION}</div>
        </div>
      </div>

      <div className="about-section__groups">
        <section className="settings-section">
          <h2 className="settings-section__title">{t('settings.about.constantTitle')}</h2>
          <dl className="about-section">
            <AboutFactRow icon={User} label={t('settings.about.author')} value={ORIGINAL_AUTHOR} />
            <AboutFactRow
              icon={Globe}
              label={t('settings.about.aboutAuthor')}
              value={stripProtocol(ORIGINAL_AUTHOR_URL)}
              href={ORIGINAL_AUTHOR_URL}
              onOpen={handleOpen}
            />
            <AboutFactRow
              icon={Globe}
              label={t('settings.about.projectSite')}
              value={stripProtocol(ORIGINAL_PROJECT_SITE)}
              href={ORIGINAL_PROJECT_SITE}
              onOpen={handleOpen}
            />
            <AboutFactRow
              icon={Link2}
              label={t('settings.about.repository')}
              value={stripProtocol(ORIGINAL_REPOSITORY_URL)}
              href={ORIGINAL_REPOSITORY_URL}
              onOpen={handleOpen}
            />
          </dl>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">{t('settings.about.variableTitle')}</h2>
          <p className="about-section__hint">{t('settings.about.variableHint')}</p>
          <dl className="about-section">
            <AboutFactRow icon={Tag} label={t('settings.about.version')} value={BUILD_VERSION} />
            <AboutFactRow icon={User} label={t('settings.about.author')} value={BUILD_AUTHOR} />
            <AboutFactRow
              icon={Globe}
              label={t('settings.about.aboutAuthor')}
              value={stripProtocol(BUILD_AUTHOR_URL)}
              href={BUILD_AUTHOR_URL}
              onOpen={handleOpen}
            />
            <AboutFactRow
              icon={Globe}
              label={t('settings.about.projectSite')}
              value={stripProtocol(BUILD_PROJECT_SITE)}
              href={BUILD_PROJECT_SITE}
              onOpen={handleOpen}
            />
            <AboutFactRow
              icon={Link2}
              label={t('settings.about.repository')}
              value={stripProtocol(BUILD_REPOSITORY_URL)}
              href={BUILD_REPOSITORY_URL}
              onOpen={handleOpen}
            />
          </dl>
        </section>
      </div>
    </div>
  );
};
