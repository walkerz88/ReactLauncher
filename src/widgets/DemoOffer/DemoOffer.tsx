import { useEffect, useRef, useState, type FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { formatFileSize } from '@/app/lib/format';
import { useContentStore } from '@/app/store/contentStore';
import { useNotificationStore } from '@/app/store/notificationStore';
import { useProfileStore } from '@/app/store/profileStore';
import { useSplashStore } from '@/app/store/splashStore';
import type { DemoProgress } from '@/electron';
import { Message } from '@/shared/Message';
import { Modal } from '@/shared/Modal';
import { ProgressBar } from '@/shared/ProgressBar';
import { Button } from '@/shared/Button';

import './DemoOffer.css';

const BYTES_PER_MB = 1024 * 1024;

const formatMb = (bytes: number): string => (bytes / BYTES_PER_MB).toFixed(1);

type Phase = 'hidden' | 'offer' | 'downloading' | 'error';

const NO_PROGRESS: DemoProgress = { phase: 'download', received: 0, total: 0 };

/**
 * On a launch with a profile but an empty library, offers to set the folders up and download a demo game
 * (once: the answer is remembered). Waits for the welcome animation to finish before asking.
 */
export const DemoOffer: FC = () => {
  const t = useTranslation();
  const hasProfiles = useProfileStore((state) => state.profiles.length > 0);
  const status = useContentStore((state) => state.status);
  const libraryEmpty = useContentStore((state) => state.apps.length === 0);
  const loadApps = useContentStore((state) => state.loadApps);
  const splashDone = useSplashStore((state) => state.done);

  const [phase, setPhase] = useState<Phase>('hidden');
  const [size, setSize] = useState(0);
  const [progress, setProgress] = useState<DemoProgress>(NO_PROGRESS);
  const checked = useRef(false);

  const markOffered = async () => {
    try {
      await window.electronAPI?.settings.set({ demoOffered: true });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (hasProfiles && status === 'idle') {
      void loadApps();
    }
  }, [hasProfiles, status, loadApps]);

  useEffect(() => {
    if (checked.current || !hasProfiles || !splashDone || status !== 'ready' || !libraryEmpty || !window.electronAPI?.demo) {
      return;
    }

    checked.current = true;

    const check = async () => {
      try {
        const settings = await window.electronAPI.settings.get();

        if (settings.demoOffered) {
          return;
        }

        const info = await window.electronAPI.demo.info();

        if (info) {
          setSize(info.size);
          setPhase('offer');
        }
      } catch (err) {
        console.error(err);
      }
    };

    void check();
  }, [hasProfiles, splashDone, status, libraryEmpty]);

  const later = () => {
    setPhase('hidden');
    void markOffered();
  };

  const start = async () => {
    setProgress(NO_PROGRESS);
    setPhase('downloading');

    const unsubscribe = window.electronAPI.demo.onProgress(setProgress);

    try {
      const result = await window.electronAPI.demo.download();

      if (result.ok) {
        await markOffered();
        await loadApps();
        useNotificationStore.getState().pushNotification(t('demo.done'), 'success');
        setPhase('hidden');
      } else {
        setPhase(result.cancelled ? 'offer' : 'error');
      }
    } catch (err) {
      console.error(err);
      setPhase('error');
    } finally {
      unsubscribe();
    }
  };

  const cancel = () => {
    void window.electronAPI.demo.cancel();
  };

  if (phase === 'hidden') {
    return null;
  }

  const busy = phase === 'downloading';
  const extracting = busy && progress.phase === 'extract';
  const ratio = progress.total > 0 ? Math.min(1, progress.received / progress.total) : 0;
  const percent = Math.floor(ratio * 100);

  const footer = busy ? (
    <Button type="button" disabled={extracting} onClick={cancel} data-gamepad-focusable>
      {t('demo.cancel')}
    </Button>
  ) : (
    <>
      <Button type="button" onClick={later} data-gamepad-focusable>
        {phase === 'error' ? t('demo.close') : t('demo.later')}
      </Button>
      <Button type="button" variant="accent" autoFocus onClick={() => void start()} data-gamepad-focusable>
        {phase === 'error' ? t('demo.retry') : t('demo.accept')}
      </Button>
    </>
  );

  return (
    <Modal
      title={t('demo.title')}
      ariaLabel={t('demo.title')}
      onClose={busy ? cancel : later}
      className="confirm-modal"
      footer={footer}
      closeOnOverlayClick={false}
      showCloseButton={!busy}
    >
      <div data-id="DemoOffer">
        {phase === 'offer' ? (
          <p className="confirm-modal__message">
            {t('demo.question').replace('{size}', size > 0 ? formatFileSize(size) : '—')}
          </p>
        ) : null}

        {busy ? (
          <>
            <p className="confirm-modal__message">{extracting ? t('demo.extracting') : t('demo.downloading')}</p>
            {extracting ? null : (
              <>
                <div className="demo-offer__progress-row">
                  <ProgressBar value={ratio} label={t('demo.downloading')} className="demo-offer__progress" />
                  <span className="demo-offer__percent">{progress.total > 0 ? `${percent}%` : null}</span>
                </div>
                <p className="demo-offer__text">
                  {progress.total > 0
                    ? t('update.progress')
                        .replace('{received}', formatMb(progress.received))
                        .replace('{total}', formatMb(progress.total))
                    : progress.received > 0
                      ? t('update.progressUnknown').replace('{received}', formatMb(progress.received))
                      : null}
                </p>
              </>
            )}
          </>
        ) : null}

        {phase === 'error' ? <Message type="error">{t('demo.error')}</Message> : null}
      </div>
    </Modal>
  );
};
