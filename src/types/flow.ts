export type Position = "left" | "right" | "top" | "bottom";

export interface XYPosition {
  x: number;
  y: number;
}

export interface Node<T = Record<string, unknown>, U extends string = string> {
  id: string;
  position: XYPosition;
  data: T;
  type?: U;
  style?: Record<string, any>;
  className?: string;
  targetPosition?: Position;
  sourcePosition?: Position;
  hidden?: boolean;
  selected?: boolean;
  dragging?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  dragHandle?: string;
  width?: number | null;
  height?: number | null;
  parentId?: string;
  zIndex?: number;
  extent?: "parent" | [[number, number], [number, number]];
  expandParent?: boolean;
  ariaLabel?: string;
  focusable?: boolean;
  resizing?: boolean;
}

export interface Edge<T = Record<string, unknown>> {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  type?: string;
  animated?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  className?: string;
  style?: Record<string, any>;
  data?: T;
  selected?: boolean;
  markerStart?: any;
  markerEnd?: any;
  zIndex?: number;
  ariaLabel?: string;
  interactionWidth?: number;
  focusable?: boolean;
}

export interface NodeChange {
  type: "position" | "dimensions" | "select" | "remove" | "reset" | "add";
  id?: string;
  item?: Node;
  position?: XYPosition;
  dimensions?: { width: number; height: number };
  selected?: boolean;
  resizing?: boolean;
}

export interface EdgeChange {
  type: "select" | "remove" | "add" | "reset";
  id?: string;
  item?: Edge;
  selected?: boolean;
}

export interface NodeProps<T = Record<string, unknown>> {
  id: string;
  data: T;
  dragHandle?: string;
  type: string;
  selected?: boolean;
  isConnectable?: boolean;
  xPos?: number;
  yPos?: number;
  targetPosition?: Position;
  sourcePosition?: Position;
}

export interface InternalNode<T = Record<string, unknown>> extends Node<T> {
  internals?: {
    positionAbsolute: XYPosition;
    handleBounds?: Record<string, any>;
  };
}
