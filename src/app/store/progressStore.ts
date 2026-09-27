import { create } from 'zustand';

import type { ProgressNotification, ProgressView } from '@/electron';

const MAX_TOASTS = 4;

export interface Toast {
  key: number;
  notification: ProgressNotification;
}

interface ProgressState {
  /** The active profile's progress as computed by the main process; `null` until it arrives. */
  view: ProgressView | null;
  toasts: Toast[];
  setView: (view: ProgressView | null) => void;
  pushToast: (notification: ProgressNotification) => void;
  dismissToast: (key: number) => void;
}

let nextToastKey = 1;

/** Mirror of the main process' progress; nothing is stored here, the numbers are only ever set by the main process. */
export const useProgressStore = create<ProgressState>()((set) => ({
  view: null,
  toasts: [],
  setView: (view) => set({ view }),
  pushToast: (notification) =>
    set((state) => ({ toasts: [...state.toasts, { key: nextToastKey++, notification }].slice(-MAX_TOASTS) })),
  dismissToast: (key) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.key !== key) })),
}));
