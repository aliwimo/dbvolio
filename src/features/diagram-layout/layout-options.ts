import type {
  LayoutDirection,
  LayoutSpacing,
} from "../../stores/diagram-view-store";

export type LayoutScope = "all" | "selection";

export interface AutoLayoutOptions {
  rankdir: LayoutDirection;
  spacing: LayoutSpacing;
  scope: LayoutScope;
  selectedNodeId: string | null;
  separateComponents: boolean;
}

export interface AutoLayoutRunOptions {
  fitView: boolean;
}
