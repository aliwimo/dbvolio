export interface LayoutNodePosition {
  x: number;
  y: number;
}

export interface LayoutViewport {
  x: number;
  y: number;
  zoom: number;
}

/** Layout for one schema entry file (diagram root). */
export interface DiagramLayout {
  nodes: Record<string, LayoutNodePosition>;
  viewport?: LayoutViewport;
}

export interface LayoutMetadata {
  version: 2;
  /** Keyed by entry DBML path relative to project root (e.g. `main.dbml`). */
  diagrams: Record<string, DiagramLayout>;
}

/** @deprecated v1 on-disk shape — migrated on load. */
export interface LegacyLayoutMetadata {
  version: 1;
  nodes: Record<string, LayoutNodePosition>;
  nodeColors?: Record<string, string>;
  viewport?: LayoutViewport;
}

export const EMPTY_LAYOUT: LayoutMetadata = {
  version: 2,
  diagrams: {},
};

export const LEGACY_LAYOUT_KEY = "_legacy";
