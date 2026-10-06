import type { FC } from 'react';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';

import { useTranslation } from '@/app/i18n';
import { useNotificationStore } from '@/app/store/notificationStore';

import './NotificationToasts.css';

/** Generic success/error toasts (e.g. "library updated", or a failed background action), stacked in
 * the corner for a few seconds. */
export const NotificationToasts: FC = () => {
  const t = useTranslation();
  const notifications = useNotificationStore((state) => state.notifications);
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);

  return (
    <div className="notification-toasts" aria-live="polite" data-id="NotificationToasts">
      {notifications.map((notification) =>
        notification.type === 'update' ? (
          <div key={notification.id} className="notification-toast notification-toast--update" data-id="NotificationToast">
            <Download size={28} className="notification-toast__icon" />
            <div className="notification-toast__body">
              <span className="notification-toast__caption">{t('update.toastCaption')}</span>
              <span className="notification-toast__text">{notification.message}</span>
              <div className="notification-toast__actions">
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => dismissNotification(notification.id)}
                  data-gamepad-focusable
                >
                  {t('update.close')}
                </button>
                <button
                  type="button"
                  className="btn btn--small btn--accent"
                  onClick={() => {
                    dismissNotification(notification.id);
                    notification.onClick?.();
                  }}
                  data-gamepad-focusable
                >
                  {t('update.details')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            key={notification.id}
            type="button"
            className={`notification-toast${notification.type === 'error' ? ' notification-toast--error' : ''}`}
            onClick={() => dismissNotification(notification.id)}
            data-id="NotificationToast"
          >
            {notification.type === 'error' ? (
              <AlertCircle size={20} className="notification-toast__icon" />
            ) : (
              <CheckCircle2 size={20} className="notification-toast__icon" />
            )}
            <span className="notification-toast__text">{notification.message}</span>
          </button>
        ),
      )}
    </div>
  );
};
