import type { FC } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { useNotificationStore } from '@/app/store/notificationStore';

import './NotificationToasts.css';

/** Generic success/error toasts (e.g. "library updated", or a failed background action), stacked in
 * the corner for a few seconds. */
export const NotificationToasts: FC = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const dismissNotification = useNotificationStore((state) => state.dismissNotification);

  return (
    <div className="notification-toasts" aria-live="polite" data-id="NotificationToasts">
      {notifications.map((notification) => (
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
      ))}
    </div>
  );
};
