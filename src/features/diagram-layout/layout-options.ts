import type {
  LayoutAlgorithm,
  LayoutSpacing,
} from "../diagram/diagram-view-store";
import type { LayoutDirection } from "../diagram/diagram-view-store";

export type LayoutScope = "all" | "selection";

export interface AutoLayoutOptions {
  algorithm: LayoutAlgorithm;
  rankdir: LayoutDirection;
  spacing: LayoutSpacing;
  scope: LayoutScope;
  selectedNodeId: string | null;
  separateComponents: boolean;
}

export interface AutoLayoutRunOptions {
  fitView: boolean;
}
