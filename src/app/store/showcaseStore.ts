import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { profileStorage } from '@/app/lib/profile';
import type { MessageKey } from '@/app/i18n';

import type { ShowcaseCheckResult, ShowcaseData, ShowcaseGame } from '@/electron';

export interface ShowcaseEntry {
  id: string;
  url: string;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: MessageKey | null;
  data: ShowcaseData | null;
}

interface ShowcaseState {
  entries: ShowcaseEntry[];
  addShowcase: (url: string) => Promise<void>;
  removeShowcase: (id: string) => void;
  reorderShowcases: (newOrder: ShowcaseEntry[]) => void;
  refreshShowcase: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  getAllGames: () => ShowcaseGame[];
  getGame: (id: string) => ShowcaseGame | null;
}

let idCounter = 0;
const generateId = () => `showcase-${Date.now()}-${++idCounter}`;

export const useShowcaseStore = create<ShowcaseState>()(
  persist(
    (set, get) => ({
      entries: [],

      addShowcase: async (url: string) => {
        const trimmed = url.trim();

        if (!trimmed) return;

        const id = generateId();
        const entry: ShowcaseEntry = { id, url: trimmed, status: 'loading', error: null, data: null };

        set((state) => ({ entries: [...state.entries, entry] }));

        try {
          const result = await window.electronAPI.showcase.load(trimmed);

          if (result.status === 'available') {
            set((state) => ({
              entries: state.entries.map((e) => (e.id === id ? { ...e, status: 'loaded', data: result.data } : e)),
            }));
          } else {
            set((state) => ({
              entries: state.entries.map((e) => (e.id === id ? { ...e, status: 'error', error: 'showcase.loadFailed' } : e)),
            }));
          }
        } catch {
          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? { ...e, status: 'error', error: 'showcase.loadFailed' } : e)),
          }));
        }
      },

      removeShowcase: (id: string) => {
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      },

      reorderShowcases: (newOrder: ShowcaseEntry[]) => {
        set({ entries: newOrder });
      },

      refreshShowcase: async (id: string) => {
        const entry = get().entries.find((e) => e.id === id);

        if (!entry) return;

        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, status: 'loading', error: null } : e)),
        }));

        try {
          const result = await window.electronAPI.showcase.load(entry.url);

          if (result.status === 'available') {
            set((state) => ({
              entries: state.entries.map((e) => (e.id === id ? { ...e, status: 'loaded', data: result.data } : e)),
            }));
          } else {
            set((state) => ({
              entries: state.entries.map((e) => (e.id === id ? { ...e, status: 'error', error: 'showcase.loadFailed' } : e)),
            }));
          }
        } catch {
          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? { ...e, status: 'error', error: 'showcase.loadFailed' } : e)),
          }));
        }
      },

      refreshAll: async () => {
        const { entries } = get();
        const promises = entries.map((entry) => get().refreshShowcase(entry.id));

        await Promise.all(promises);
      },

      getAllGames: (): ShowcaseGame[] => {
        const { entries } = get();

        return entries
          .filter((e) => e.status === 'loaded' && e.data)
          .flatMap((e) => e.data!.games);
      },

      getGame: (id: string) => {
        const allGames = get().getAllGames();

        return allGames.find((game) => game.id === id) ?? null;
      },
    }),
    {
      name: 'showcase',
      storage: createJSONStorage(() => profileStorage),
      version: 2,
      partialize: (state) => ({ entries: state.entries.map(({ id, url }) => ({ id, url })) }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as { entries?: Array<{ id: string; url: string }> };

        if (stored.entries && Array.isArray(stored.entries)) {
          return {
            ...current,
            entries: stored.entries.map(({ id, url }) => ({
              id,
              url,
              status: 'idle' as const,
              error: null,
              data: null,
            })),
          };
        }

        return current;
      },
    },
  ),
);
