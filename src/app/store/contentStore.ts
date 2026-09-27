import { create } from "zustand";

import type { ContentApp } from "@/electron";
import { useFavoritesStore } from "@/app/store/favoritesStore";

type ContentStatus = "idle" | "loading" | "ready" | "error";

interface ContentState {
  apps: ContentApp[];
  /** Absolute path that was scanned — shown to the user when the list is empty. */
  dir: string | null;
  status: ContentStatus;
  error: string | null;
  /** Scan `./content` (via the main process) and populate `apps`. */
  loadApps: () => Promise<void>;
  /** Launch an app by id; sets `error` on failure. Resolves to whether it succeeded. */
  launchApp: (id: string) => Promise<boolean>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  apps: [],
  dir: null,
  status: "idle",
  error: null,

  loadApps: async () => {
    if (get().status === "loading") {
      return;
    }
    if (!window.electronAPI?.content) {
      set({
        status: "error",
        error: "Список игр доступен только в десктоп-приложении",
      });

      return;
    }

    set({ status: "loading", error: null });
    try {
      const { dir, apps } = await window.electronAPI.content.list();
      set({ dir, apps, status: "ready" });

      // Drop favourites whose folder no longer exists (e.g. deleted from disk)
      // so stale ids don't linger forever and mis-signal "has favourites" in the UI.
      const validIds = new Set(apps.map((app) => app.id));
      const { ids } = useFavoritesStore.getState();
      const stillValid = ids.filter((id) => validIds.has(id));
      if (stillValid.length !== ids.length) {
        useFavoritesStore.setState({ ids: stillValid });
      }
    } catch (err) {
      set({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "Не удалось прочитать папку ./content",
      });
    }
  },

  launchApp: async (id) => {
    try {
      const result = await window.electronAPI.content.launch(id);
      if (!result.ok) {
        set({ error: result.error ?? "Не удалось запустить игру" });
      }

      return result.ok;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Не удалось запустить игру",
      });

      return false;
    }
  },
}));
