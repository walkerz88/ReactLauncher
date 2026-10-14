import { useMemo } from 'react';

import { isInstallable } from '@/app/lib/readyToLaunch';
import { useContentStore } from '@/app/store/contentStore';
import { useTorrentsStore } from '@/app/store/torrentsStore';
import type { ContentApp } from '@/electron';

/** Games that can be installed, minus those whose installer is still being downloaded by a torrent. */
export const useInstallableApps = (): ContentApp[] => {
  const apps = useContentStore((state) => state.apps);
  const torrents = useTorrentsStore((state) => state.torrents);

  return useMemo(() => {
    const downloading = new Set(torrents.filter((torrent) => torrent.progress < 1).map((torrent) => torrent.gameId));

    return apps.filter((app) => isInstallable(app) && !downloading.has(app.id));
  }, [apps, torrents]);
};
