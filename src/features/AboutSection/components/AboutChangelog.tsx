import { useState, type FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { useLocaleStore } from '@/app/store/localeStore';
import changelogData from '@/app/lib/changelog.json';

interface ChangelogText {
  ru: string;
  en: string;
}

interface ChangelogEntry {
  version: string;
  date?: string;
  title: ChangelogText;
  changes: ChangelogText[];
}

const ENTRIES: ChangelogEntry[] = [...(changelogData as ChangelogEntry[])].reverse();
const PAGE_SIZE = 5;

/** Newest-first version history, read from `app/lib/changelog.json`. Only `visibleCount` entries are
 * ever rendered — "Show more" grows it by a page at a time, so a long history doesn't all hit the DOM
 * at once. */
export const AboutChangelog: FC = () => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleEntries = ENTRIES.slice(0, visibleCount);
  const hasMore = visibleCount < ENTRIES.length;

  return (
    <section className="settings-section" data-id="AboutChangelog">
      <h2 className="settings-section__title">{t('settings.about.changelogTitle')}</h2>

      <div className="about-section__changelog">
        {visibleEntries.map((entry) => (
          <article key={entry.version} className="about-section__changelog-entry">
            <div className="about-section__changelog-header">
              <span className="about-section__changelog-version">{entry.version}</span>
              {entry.date ? <span className="about-section__changelog-date">{entry.date}</span> : null}
            </div>
            <h3 className="about-section__changelog-entry-title">{entry.title[locale] ?? entry.title.en}</h3>
            <ul className="about-section__changelog-list">
              {entry.changes.map((change, index) => (
                <li key={index}>{change[locale] ?? change.en}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          className="btn btn--small about-section__changelog-more"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          data-gamepad-focusable
        >
          {t('settings.about.changelogMore')}
        </button>
      ) : null}
    </section>
  );
};
