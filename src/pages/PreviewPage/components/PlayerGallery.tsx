import { useCallback, useEffect, useState, type FC } from 'react';
import { Camera, FolderOpen, Play, Trash2, Video } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { ConfirmModal } from '@/shared/ConfirmModal';

import { MediaViewer, type MediaItem } from './MediaViewer';

export interface PlayerGalleryProps {
  appId: string;
}

/** The player's own F9/F10 screenshots and clips for this game (`electron/capture.ts`), one
 * navigable gallery — opening a clip doesn't mean leaving the screenshots behind. */
export const PlayerGallery: FC<PlayerGalleryProps> = ({ appId }) => {
  const t = useTranslation();
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    const capture = window.electronAPI?.capture;

    if (!capture) {
      return;
    }

    try {
      const list = await capture.list(appId);
      setScreenshots(list.screenshots);
      setRecordings(list.recordings);
    } catch (err) {
      console.error('[PlayerGallery] loading failed:', err);
    }
  }, [appId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const capture = window.electronAPI?.capture;

    if (!capture) {
      return undefined;
    }

    const stopScreenshot = capture.onScreenshotTaken((event) => {
      if (event.gameId === appId) {
        void reload();
      }
    });
    const stopRecording = capture.onRecordingSaved((event) => {
      if (event.gameId === appId) {
        void reload();
      }
    });

    return () => {
      stopScreenshot();
      stopRecording();
    };
  }, [appId, reload]);

  const handleReveal = async (src: string) => {
    const capture = window.electronAPI?.capture;

    if (!capture) {
      return;
    }

    try {
      await capture.reveal(src);
    } catch (err) {
      console.error('[PlayerGallery] reveal failed:', err);
    }
  };

  const confirmDelete = async () => {
    const capture = window.electronAPI?.capture;

    if (!capture || !pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await capture.delete(pendingDelete.src);
      setOpenIndex(null);
      setPendingDelete(null);
      await reload();
    } catch (err) {
      console.error('[PlayerGallery] delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const items: MediaItem[] = [
    ...screenshots.map((src) => ({ type: 'image' as const, src })),
    ...recordings.map((src) => ({ type: 'video' as const, src })),
  ];

  return (
    <section className="app-page__player-gallery" data-id="PlayerGallery">
      <h2 className="app-page__section-title">{t('app.playerGallery')}</h2>
      <div className="app-page__player-gallery-hint">
        <span className="app-page__hint-row">
          <Camera size={14} aria-hidden="true" />
          <kbd>Ctrl</kbd>
          <kbd>Shift</kbd>
          <kbd className="app-page__hint-key">F9</kbd>
          <span>{t('app.playerGalleryScreenshotHint')}</span>
        </span>
        <span className="app-page__hint-row">
          <Video size={14} aria-hidden="true" />
          <kbd>Ctrl</kbd>
          <kbd>Shift</kbd>
          <kbd className="app-page__hint-key">F10</kbd>
          <span>{t('app.playerGalleryRecordingHint')}</span>
        </span>
      </div>

      {items.length > 0 ? (
        <div className="app-page__screens">
          {screenshots.map((src, index) => (
            <div key={src} className="app-page__screen-slot">
              <button
                type="button"
                className="app-page__screen"
                onClick={() => setOpenIndex(index)}
                data-gamepad-focusable
              >
                <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
              </button>
              <button
                type="button"
                className="app-page__screen-reveal"
                aria-label={t('app.playerGalleryShowInFolder')}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleReveal(src);
                }}
                data-gamepad-focusable
              >
                <FolderOpen size={14} />
              </button>
              <button
                type="button"
                className="app-page__screen-delete"
                aria-label={t('app.playerGalleryDelete')}
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDelete({ type: 'image', src });
                }}
                data-gamepad-focusable
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {recordings.map((src, index) => (
            <div key={src} className="app-page__screen-slot">
              <button
                type="button"
                className="app-page__screen"
                onClick={() => setOpenIndex(screenshots.length + index)}
                data-gamepad-focusable
              >
                <video src={src} muted preload="metadata" />
                <span className="app-page__screen-play" aria-hidden="true">
                  <Play size={28} fill="currentColor" />
                </span>
              </button>
              <button
                type="button"
                className="app-page__screen-reveal"
                aria-label={t('app.playerGalleryShowInFolder')}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleReveal(src);
                }}
                data-gamepad-focusable
              >
                <FolderOpen size={14} />
              </button>
              <button
                type="button"
                className="app-page__screen-delete"
                aria-label={t('app.playerGalleryDelete')}
                onClick={(event) => {
                  event.stopPropagation();
                  setPendingDelete({ type: 'video', src });
                }}
                data-gamepad-focusable
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {openIndex !== null ? (
        <MediaViewer
          items={items}
          startIndex={openIndex}
          label={t('app.playerGallery')}
          deleteLabel={t('app.playerGalleryDelete')}
          onDelete={(item) => setPendingDelete(item)}
          revealLabel={t('app.playerGalleryShowInFolder')}
          onReveal={(item) => void handleReveal(item.src)}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmModal
          title={t('app.playerGalleryDelete')}
          message={t('app.playerGalleryDeleteConfirm')}
          confirmLabel={t('app.playerGalleryDelete')}
          cancelLabel={t('app.playerGalleryCancel')}
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!deleting) {
              setPendingDelete(null);
            }
          }}
        />
      ) : null}
    </section>
  );
};
