import { create } from 'zustand';

const TOAST_LIFETIME_MS = 4000;

export type NotificationType = 'success' | 'error';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationState {
  notifications: Notification[];
  pushNotification: (message: string, type?: NotificationType) => void;
  dismissNotification: (id: number) => void;
}

let nextId = 1;

/** Simple, generic toasts (e.g. "library updated", or a failed background action) — distinct from the achievement toasts. */
export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  pushNotification: (message, type = 'success') => {
    const id = nextId++;

    set((state) => ({ notifications: [...state.notifications, { id, message, type }] }));
    window.setTimeout(() => get().dismissNotification(id), TOAST_LIFETIME_MS);
  },
  dismissNotification: (id) => set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
}));
