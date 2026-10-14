import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { profileStorage } from "@/app/lib/profile";

export interface TableSort {
  column: string;
  descending: boolean;
}

interface TableSortState {
  /** The sort of each sortable table, keyed by table name. A table that was never sorted has no entry. */
  byTable: Record<string, TableSort>;
  setSort: (table: string, sort: TableSort) => void;
}

/** Persisted like `galleryViewStore`, so a table keeps its sort across restarts. */
export const useTableSortStore = create<TableSortState>()(
  persist(
    (set) => ({
      byTable: {},
      setSort: (table, sort) => set((state) => ({ byTable: { ...state.byTable, [table]: sort } })),
    }),
    {
      name: "tableSort",
      storage: createJSONStorage(() => profileStorage),
      version: 1,
    },
  ),
);

/** The stored sort of `table`, only if its column is one the table still has. */
export const pickTableSort = <T extends string>(
  byTable: Record<string, TableSort>,
  table: string,
  columns: readonly T[],
): { column: T; descending: boolean } | null => {
  const stored = byTable[table];
  const column = columns.find((candidate) => candidate === stored?.column);

  return stored && column ? { column, descending: stored.descending === true } : null;
};
