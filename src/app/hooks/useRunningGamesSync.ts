import { useEffect } from 'react';

import { usePlaytimeStore } from '@/app/store/playtimeStore';
import { useRunningStore } from '@/app/store/runningStore';

/** Mirrors the main process' "game started / exited" events into the running and play-time stores. Call once. */
export const useRunningGamesSync = (): void => {
  useEffect(() => {
    const content = window.electronAPI?.content;

    if (!content?.onRunningChanged) {
      return undefined;
    }

    let cancelled = false;

    const syncInitial = async () => {
      try {
        const ids = await content.running();

        if (!cancelled) {
          useRunningStore.getState().setIds(ids);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void syncInitial();

    const unsubscribe = content.onRunningChanged((event) => {
      useRunningStore.getState().setIds(event.running);

      if (event.type === 'ended' && event.seconds !== undefined) {
        usePlaytimeStore.getState().addSession(event.id, event.seconds);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
};
