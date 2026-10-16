import { create } from "zustand";
import type { LayoutViewport } from "../types/layout";

export type LayoutDirection = "LR" | "TB" | "RL" | "BT";
export type LayoutSpacing = "compact" | "default" | "relaxed";
export type LayoutAlgorithm =
  | "left-right"
  | "pipeline"
  | "snowflake"
  | "compact";

export interface DiagramViewOptions {
  layoutAlgorithm: LayoutAlgorithm;
  layoutDirection: LayoutDirection;
  layoutSpacing: LayoutSpacing;
  layoutFitView: boolean;
  layoutSeparateComponents: boolean;
  showMinimap: boolean;
  showGrid: boolean;
  showEdgeLabels: boolean;
  showControls: boolean;
  hideUnmatchedSearch: boolean;
  emphasizeRelated: boolean;
  snapToGrid: boolean;
  animateRelationships: boolean;
}

interface DiagramViewState extends DiagramViewOptions {
  pendingViewport: LayoutViewport | null;
  setOption: <K extends keyof DiagramViewOptions>(
    key: K,
    value: DiagramViewOptions[K],
  ) => void;
  toggleOption: (key: keyof DiagramViewOptions) => void;
  setPendingViewport: (viewport: LayoutViewport | null) => void;
}

const STORAGE_KEY = "dbvolio-diagram-view";

const defaults: DiagramViewOptions = {
  layoutAlgorithm: "left-right",
  layoutDirection: "LR",
  layoutSpacing: "default",
  layoutFitView: true,
  layoutSeparateComponents: true,
  showMinimap: false,
  showGrid: true,
  showEdgeLabels: false,
  showControls: false,
  hideUnmatchedSearch: true,
  emphasizeRelated: true,
  snapToGrid: false,
  animateRelationships: false,
};

const STORAGE_VERSION = 4;

function loadOptions(): DiagramViewOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DiagramViewOptions> & {
        version?: number;
      };
      const merged: DiagramViewOptions = { ...defaults, ...parsed };
      if (parsed.version !== STORAGE_VERSION) {
        if (parsed.version === 2) {
          merged.layoutSpacing = defaults.layoutSpacing;
          merged.layoutFitView = defaults.layoutFitView;
          merged.layoutSeparateComponents = defaults.layoutSeparateComponents;
        }
        if (parsed.version === 3) {
          merged.layoutAlgorithm = defaults.layoutAlgorithm;
        }
        merged.emphasizeRelated = true;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...merged, version: STORAGE_VERSION }),
        );
      }
      return merged;
    }
  } catch {
    /* ignore */
  }
  return defaults;
}

function persistOptions(options: DiagramViewOptions) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...options, version: STORAGE_VERSION }),
  );
}

export const useDiagramViewStore = create<DiagramViewState>((set, get) => ({
  ...loadOptions(),
  pendingViewport: null,

  setOption: (key, value) => {
    set((state) => {
      const next = { ...state, [key]: value };
      persistOptions({
        layoutAlgorithm: next.layoutAlgorithm,
        layoutDirection: next.layoutDirection,
        layoutSpacing: next.layoutSpacing,
        layoutFitView: next.layoutFitView,
        layoutSeparateComponents: next.layoutSeparateComponents,
        showMinimap: next.showMinimap,
        showGrid: next.showGrid,
        showEdgeLabels: next.showEdgeLabels,
        showControls: next.showControls,
        hideUnmatchedSearch: next.hideUnmatchedSearch,
        emphasizeRelated: next.emphasizeRelated,
        snapToGrid: next.snapToGrid,
        animateRelationships: next.animateRelationships,
      });
      return next;
    });
  },

  toggleOption: (key) => {
    const current = get()[key];
    if (typeof current === "boolean") {
      get().setOption(key, !current as DiagramViewOptions[typeof key]);
    }
  },

  setPendingViewport: (viewport) => set({ pendingViewport: viewport }),
}));
