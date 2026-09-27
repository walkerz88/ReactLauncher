import { useEffect, useState, type FC } from 'react';
import { FolderOpen, RotateCcw, Save, Trash2 } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { formatDateTime, formatFileSize } from '@/app/lib/format';
import { useLocaleStore } from '@/app/store/localeStore';
import { Message } from '@/shared/Message';
import { Modal } from '@/shared/Modal';
import { Tooltip } from '@/shared/Tooltip';
import type { BackupEntry, BackupResult } from '@/electron';

export interface BackupsModalProps {
  appId: string;
  appName: string;
  onClose: () => void;
}

interface PendingAction {
  kind: 'restore' | 'delete';
  name: string;
}

/** Lists a game's save backups and lets the user create, restore and delete them. */
export const BackupsModal: FC<BackupsModalProps> = ({ appId, appName, onClose }) => {
  const t = useTranslation();
  const locale = useLocaleStore((state) => state.locale);

  const [backups, setBackups] = useState<BackupEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const apply = (result: BackupResult) => {
    if (result.ok) {
      setBackups(result.backups ?? []);
      setError(null);
    } else {
      setError(result.error ?? '');
    }
  };

  const run = async (action: () => Promise<BackupResult>) => {
    setBusy(true);
    setPending(null);

    try {
      apply(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void run(() => window.electronAPI.content.backupList(appId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const content = window.electronAPI.content;

  return (
    <Modal
      title={`${appName} — ${t('backups.title')}`}
      ariaLabel={t('backups.title')}
      onClose={onClose}
      className="backups-modal"
    >
      <div className="backups-modal__body" data-id="BackupsModal">
        <p className="backups-modal__intro">{t('backups.intro')}</p>

        <div className="backups-modal__toolbar">
          <button
            type="button"
            className="btn btn--accent"
            disabled={busy}
            onClick={() => void run(() => content.backupCreate(appId))}
            data-gamepad-focusable
          >
            <Save size={16} />
            {busy && !pending ? t('backups.creating') : t('backups.create')}
          </button>
          <button type="button" className="btn" onClick={() => void content.backupOpen(appId)} data-gamepad-focusable>
            <FolderOpen size={16} />
            {t('backups.openFolder')}
          </button>
        </div>

        {error ? <Message type="error">{error}</Message> : null}

        {backups === null ? (
          <p className="backups-modal__empty">{t('backups.loading')}</p>
        ) : backups.length === 0 ? (
          <p className="backups-modal__empty">{t('backups.empty')}</p>
        ) : (
          <ul className="backups-modal__list">
            {backups.map((backup) => {
              const isPending = pending?.name === backup.name;

              return (
                <li key={backup.name} className="backups-modal__item">
                  <div className="backups-modal__info">
                    <span className="backups-modal__date">{formatDateTime(backup.createdAt, locale)}</span>
                    <span className="backups-modal__meta">
                      {backup.name} · {formatFileSize(backup.size)}
                    </span>
                  </div>

                  {isPending ? (
                    <div className="backups-modal__confirm">
                      <span>{t(pending.kind === 'restore' ? 'backups.confirmRestore' : 'backups.confirmDelete')}</span>
                      <button
                        type="button"
                        className="btn btn--accent"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            pending.kind === 'restore'
                              ? content.backupRestore(appId, backup.name)
                              : content.backupDelete(appId, backup.name),
                          )
                        }
                        data-gamepad-focusable
                      >
                        {t('backups.yes')}
                      </button>
                      <button type="button" className="btn" onClick={() => setPending(null)} data-gamepad-focusable>
                        {t('backups.no')}
                      </button>
                    </div>
                  ) : (
                    <div className="backups-modal__actions">
                      <Tooltip label={t('backups.restore')}>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={t('backups.restore')}
                          disabled={busy}
                          onClick={() => setPending({ kind: 'restore', name: backup.name })}
                          data-gamepad-focusable
                        >
                          <RotateCcw size={16} />
                        </button>
                      </Tooltip>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t('backups.delete')}
                        disabled={busy}
                        onClick={() => setPending({ kind: 'delete', name: backup.name })}
                        data-gamepad-focusable
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};
