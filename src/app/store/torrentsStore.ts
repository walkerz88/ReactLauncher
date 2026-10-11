import { create } from 'zustand';

import type { TorrentInfo } from '@/electron';

interface TorrentsState {
  /** Every torrent of the launcher, newest first (kept in sync by `useTorrentsSync`). */
  torrents: TorrentInfo[];
  setTorrents: (torrents: TorrentInfo[]) => void;
}

export const useTorrentsStore = create<TorrentsState>()((set) => ({
  torrents: [],
  setTorrents: (torrents) => set({ torrents }),
}));
