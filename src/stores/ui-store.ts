import { create } from "zustand";

export type Theme = "dark" | "light";
export type PanelId = "explorer" | "editor" | "diagram" | "inspector";

export interface PanelVisibility {
  explorer: boolean;
  editor: boolean;
  diagram: boolean;
  inspector: boolean;
}

interface UiState {
  theme: Theme;
  panels: PanelVisibility;
  explorerShowAllFiles: boolean;
  settingsOpen: boolean;
  tableEditOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  togglePanel: (panel: PanelId) => void;
  setPanel: (panel: PanelId, visible: boolean) => void;
  setExplorerShowAllFiles: (show: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  openTableEdit: () => void;
  closeTableEdit: () => void;
}

const storedTheme = localStorage.getItem("dbvolio-theme");
const initialTheme: Theme =
  storedTheme === "dark" ? "dark" : "light";

function loadPanels(): PanelVisibility {
  try {
    const raw = localStorage.getItem("dbvolio-panels");
    if (raw) {
      return { ...defaultPanels, ...(JSON.parse(raw) as PanelVisibility) };
    }
  } catch {
    /* ignore */
  }
  return defaultPanels;
}

const defaultPanels: PanelVisibility = {
  explorer: true,
  editor: true,
  diagram: true,
  inspector: true,
};

function persistPanels(panels: PanelVisibility) {
  localStorage.setItem("dbvolio-panels", JSON.stringify(panels));
}

function loadExplorerShowAllFiles(): boolean {
  return localStorage.getItem("dbvolio-explorer-show-all") === "true";
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme,
  panels: loadPanels(),
  explorerShowAllFiles: loadExplorerShowAllFiles(),
  settingsOpen: false,
  tableEditOpen: false,

  setTheme: (theme) => {
    localStorage.setItem("dbvolio-theme", theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  togglePanel: (panel) => {
    set((state) => {
      const next = {
        ...state.panels,
        [panel]: !state.panels[panel],
      };
      persistPanels(next);
      return { panels: next };
    });
  },

  setPanel: (panel, visible) => {
    set((state) => {
      const next = { ...state.panels, [panel]: visible };
      persistPanels(next);
      return { panels: next };
    });
  },

  setExplorerShowAllFiles: (show) => {
    localStorage.setItem("dbvolio-explorer-show-all", String(show));
    set({ explorerShowAllFiles: show });
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  openTableEdit: () => set({ tableEditOpen: true }),
  closeTableEdit: () => set({ tableEditOpen: false }),
}));

document.documentElement.dataset.theme = initialTheme;
