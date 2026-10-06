import type { FC } from 'react';

import { useTranslation } from '@/app/i18n';
import { useLocaleStore } from '@/app/store/localeStore';
import { useNotificationStore } from '@/app/store/notificationStore';
import { useUpdateStore } from '@/app/store/updateStore';
import { Modal } from '@/shared/Modal';

import './UpdateModal.css';

const CURRENT_VERSION = process.env.REACT_APP_VERSION ?? '';
const BYTES_PER_MB = 1024 * 1024;

const formatMb = (bytes: number): string => (bytes / BYTES_PER_MB).toFixed(1);

/** "Update available" dialog: new version, what changed since the running one, and the Install button. */
export const UpdateModal: FC = () => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const update = useUpdateStore((state) => state.update);
  const modalOpen = useUpdateStore((state) => state.modalOpen);
  const installing = useUpdateStore((state) => state.installing);
  const progress = useUpdateStore((state) => state.progress);
  const closeModal = useUpdateStore((state) => state.closeModal);
  const install = useUpdateStore((state) => state.install);
  const percent = progress.total > 0 ? Math.min(100, Math.floor((progress.received / progress.total) * 100)) : 0;
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  if (!modalOpen || !update) {
    return null;
  }

  const handleClose = () => {
    if (!installing) {
      closeModal();
    }
  };

  const handleInstall = async () => {
    const status = await install();

    if (status === 'error') {
      pushNotification(t('update.installFailed'), 'error');
    } else if (status === 'downloaded') {
      closeModal();
      pushNotification(t('update.downloaded'));
    }
  };

  const footer = (
    <>
      <button
        type="button"
        className="btn btn--accent"
        disabled={installing}
        autoFocus
        onClick={handleInstall}
        data-gamepad-focusable
      >
        {installing ? t('update.installing') : t('update.install')}
      </button>
    </>
  );

  return (
    <Modal
      title={t('update.title')}
      ariaLabel={t('update.title')}
      className="update-modal"
      footer={footer}
      closeOnOverlayClick={!installing}
      showCloseButton={!installing}
      onClose={handleClose}
    >
      <div data-id="UpdateModal">
        <dl className="update-modal__versions">
          {CURRENT_VERSION ? (
            <div className="update-modal__version-row">
              <dt>{t('update.currentVersion')}</dt>
              <dd>{CURRENT_VERSION}</dd>
            </div>
          ) : null}
          <div className="update-modal__version-row">
            <dt>{t('update.newVersion')}</dt>
            <dd>{update.version}</dd>
          </div>
        </dl>

        {installing ? (
          <>
            <div className="update-modal__progress-row">
              <div className="update-modal__progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="update-modal__progress-bar" style={{ width: `${percent}%` }} />
              </div>
              <span className="update-modal__progress-percent">{progress.total > 0 ? `${percent}%` : null}</span>
            </div>
            <p className="update-modal__progress-text">
              {progress.total > 0
                ? t('update.progress')
                    .replace('{received}', formatMb(progress.received))
                    .replace('{total}', formatMb(progress.total))
                : progress.received > 0
                  ? t('update.progressUnknown').replace('{received}', formatMb(progress.received))
                  : null}
            </p>
          </>
        ) : null}

        <h3 className="update-modal__subtitle">{t('update.changes')}</h3>

        {update.changelog.length === 0 ? (
          <p className="update-modal__empty">{t('update.noChangelog')}</p>
        ) : (
          <div className="update-modal__changelog">
            {update.changelog.map((entry) => (
              <article key={entry.version} className="update-modal__entry">
                <div className="update-modal__entry-header">
                  <span className="update-modal__entry-version">{entry.version}</span>
                  {entry.date ? <span className="update-modal__entry-date">{entry.date}</span> : null}
                </div>
                <h4 className="update-modal__entry-title">{entry.title[locale] ?? entry.title.en}</h4>
                <ul className="update-modal__list">
                  {entry.changes.map((change, index) => (
                    <li key={index}>{change[locale] ?? change.en}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
