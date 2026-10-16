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
  inspectorWidth: number;
  settingsOpen: boolean;
  tableEditOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  togglePanel: (panel: PanelId) => void;
  setPanel: (panel: PanelId, visible: boolean) => void;
  setExplorerShowAllFiles: (show: boolean) => void;
  setInspectorWidth: (width: number) => void;
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

export const MIN_INSPECTOR_WIDTH = 240;
export const MAX_INSPECTOR_WIDTH = 600;
export const DEFAULT_INSPECTOR_WIDTH = 320;

function loadInspectorWidth(): number {
  const raw = Number(localStorage.getItem("dbvolio-inspector-width"));
  if (Number.isFinite(raw) && raw >= MIN_INSPECTOR_WIDTH && raw <= MAX_INSPECTOR_WIDTH) {
    return raw;
  }
  return DEFAULT_INSPECTOR_WIDTH;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme,
  panels: loadPanels(),
  explorerShowAllFiles: loadExplorerShowAllFiles(),
  inspectorWidth: loadInspectorWidth(),
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

  setInspectorWidth: (width) => {
    const clamped = Math.min(
      Math.max(Math.round(width), MIN_INSPECTOR_WIDTH),
      MAX_INSPECTOR_WIDTH,
    );
    localStorage.setItem("dbvolio-inspector-width", String(clamped));
    set({ inspectorWidth: clamped });
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  openTableEdit: () => set({ tableEditOpen: true }),
  closeTableEdit: () => set({ tableEditOpen: false }),
}));

document.documentElement.dataset.theme = initialTheme;
