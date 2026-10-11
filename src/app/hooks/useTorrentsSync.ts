import { useEffect, useRef } from 'react';

import { useTranslation } from '@/app/i18n';
import { useContentStore } from '@/app/store/contentStore';
import { useNotificationStore } from '@/app/store/notificationStore';
import { useTorrentsStore } from '@/app/store/torrentsStore';

/** Mirrors the main process' torrent list into the store, and announces finished downloads. Call once. */
export const useTorrentsSync = (): void => {
  const t = useTranslation();
  const tRef = useRef(t);

  tRef.current = t;

  useEffect(() => {
    const torrents = window.electronAPI?.torrents;

    if (!torrents?.onUpdated) {
      return undefined;
    }

    let cancelled = false;

    const syncInitial = async () => {
      try {
        const list = await torrents.list();

        if (!cancelled) {
          useTorrentsStore.getState().setTorrents(list);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void syncInitial();

    const unsubscribeUpdated = torrents.onUpdated((list) => useTorrentsStore.getState().setTorrents(list));
    const unsubscribeCompleted = torrents.onCompleted((event) => {
      useNotificationStore.getState().pushNotification(tRef.current('downloads.completed').replace('{name}', event.name));
      void useContentStore.getState().loadApps();
    });

    return () => {
      cancelled = true;
      unsubscribeUpdated();
      unsubscribeCompleted();
    };
  }, []);
};
