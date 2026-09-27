import { useState, type FC } from 'react';
import { Play } from 'lucide-react';

import { useTranslation } from '@/app/i18n';

import { MediaViewer, type MediaItem } from './MediaViewer';

export interface MediaSectionProps {
  /** `content://` URLs of the screenshots. */
  screenshots: string[];
  /** `content://` URL of the trailer video, or `null`. */
  trailer: string | null;
}

/** Trailer (first) and screenshot thumbnails, all one navigable gallery — click any one to open the
 * full-screen viewer without leaving it to watch the others. */
export const MediaSection: FC<MediaSectionProps> = ({ screenshots, trailer }) => {
  const t = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [trailerFailed, setTrailerFailed] = useState(false);

  const showTrailer = trailer && !trailerFailed;

  if (!showTrailer && screenshots.length === 0) {
    return null;
  }

  const items: MediaItem[] = [
    ...(showTrailer ? [{ type: 'video' as const, src: trailer }] : []),
    ...screenshots.map((src) => ({ type: 'image' as const, src })),
  ];

  return (
    <section className="app-page__media" data-id="MediaSection">
      <h2 className="app-page__section-title">{t('app.screenshots')}</h2>
      <div className="app-page__screens">
        {showTrailer ? (
          <button
            type="button"
            className="app-page__screen"
            onClick={() => setOpenIndex(0)}
            data-gamepad-focusable
          >
            <video src={trailer} muted preload="metadata" onError={() => setTrailerFailed(true)} />
            <span className="app-page__screen-play" aria-hidden="true">
              <Play size={28} fill="currentColor" />
            </span>
          </button>
        ) : null}

        {screenshots.map((src, index) => (
          <button
            key={src}
            type="button"
            className="app-page__screen"
            onClick={() => setOpenIndex((showTrailer ? 1 : 0) + index)}
            data-gamepad-focusable
          >
            <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
          </button>
        ))}
      </div>

      {openIndex !== null ? (
        <MediaViewer items={items} startIndex={openIndex} label={t('app.screenshots')} onClose={() => setOpenIndex(null)} />
      ) : null}
    </section>
  );
};
