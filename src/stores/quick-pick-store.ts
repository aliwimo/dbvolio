import { create } from "zustand";

export type QuickPickKind = "recent" | "files";

interface QuickPickState {
  kind: QuickPickKind | null;
  query: string;
  selectedIndex: number;
  open: (kind: QuickPickKind) => void;
  close: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
}

export const useQuickPickStore = create<QuickPickState>((set, get) => ({
  kind: null,
  query: "",
  selectedIndex: 0,

  open: (kind) => {
    const current = get().kind;
    if (current === kind) {
      set({ kind: null, query: "", selectedIndex: 0 });
      return;
    }
    set({ kind, query: "", selectedIndex: 0 });
  },

  close: () => set({ kind: null, query: "", selectedIndex: 0 }),

  setQuery: (query) => set({ query, selectedIndex: 0 }),

  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),
}));
