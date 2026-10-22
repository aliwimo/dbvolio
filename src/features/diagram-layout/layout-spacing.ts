import type { Node } from "@xyflow/react";
import type { LayoutSpacing } from "../../stores/diagram-view-store";
import { layoutNodeSize } from "./layout-node-bounds";

export interface LayoutSpacingMetrics {
  rankGap: number;
  stackGap: number;
  componentGap: number;
  colGap: number;
  rowGap: number;
  /** Minimum clearance between node bounding boxes. */
  margin: number;
  ringPadding: number;
}

export function spacingMetrics(
  spacing: LayoutSpacing = "default",
): LayoutSpacingMetrics {
  const presets: Record<LayoutSpacing, LayoutSpacingMetrics> = {
    compact: {
      rankGap: 64,
      stackGap: 24,
      componentGap: 88,
      colGap: 40,
      rowGap: 28,
      margin: 12,
      ringPadding: 40,
    },
    default: {
      rankGap: 104,
      stackGap: 36,
      componentGap: 128,
      colGap: 56,
      rowGap: 44,
      margin: 16,
      ringPadding: 56,
    },
    relaxed: {
      rankGap: 148,
      stackGap: 52,
      componentGap: 176,
      colGap: 80,
      rowGap: 64,
      margin: 24,
      ringPadding: 80,
    },
  };
  return presets[spacing];
}

export function nodeBounds(node: Node, margin = 0) {
  const { width, height } = layoutNodeSize(node);
  return {
    id: node.id,
    x: node.position.x - margin,
    y: node.position.y - margin,
    width: width + margin * 2,
    height: height + margin * 2,
  };
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeparatableBox extends LayoutRect {
  id: string;
  movable?: boolean;
}

function rectsOverlap(a: LayoutRect, b: LayoutRect, gap: number): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

function overlapAmounts(
  a: LayoutRect,
  b: LayoutRect,
  gap: number,
): { x: number; y: number } {
  return {
    x:
      Math.min(a.x + a.width, b.x + b.width) -
      Math.max(a.x, b.x) +
      gap,
    y:
      Math.min(a.y + a.height, b.y + b.height) -
      Math.max(a.y, b.y) +
      gap,
  };
}

function boundingRect(boxes: SeparatableBox[]): LayoutRect | null {
  if (boxes.length === 0) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Last-resort placement for boxes the iterative pass could not separate.
 * Conflicting movable boxes are shelf-packed below every other box, which is
 * guaranteed to be overlap-free (unlike unbounded pairwise nudging).
 */
function shelfPackConflicts(boxes: SeparatableBox[], gap: number): void {
  const conflicting = new Set<string>();
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (!rectsOverlap(boxes[i], boxes[j], gap)) {
        continue;
      }
      if (boxes[i].movable !== false) {
        conflicting.add(boxes[i].id);
      }
      if (boxes[j].movable !== false) {
        conflicting.add(boxes[j].id);
      }
    }
  }
  if (conflicting.size === 0) {
    return;
  }

  const obstacles = boxes.filter((box) => !conflicting.has(box.id));
  const toPlace = boxes
    .filter((box) => conflicting.has(box.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const occupied = boundingRect(obstacles);

  const startX = occupied ? occupied.x : 0;
  let x = startX;
  let y = occupied ? occupied.y + occupied.height + gap * 2 : 0;
  const rowLimit = Math.max(
    occupied ? occupied.x + occupied.width : 0,
    startX + 1200,
  );
  let rowHeight = 0;

  for (const box of toPlace) {
    if (x > startX && x + box.width > rowLimit) {
      x = startX;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    box.x = x;
    box.y = y;
    x += box.width + gap;
    rowHeight = Math.max(rowHeight, box.height);
  }
}

/**
 * Separates axis-aligned boxes so every pair keeps at least `gap` clearance.
 * Immovable boxes (movable === false) are treated as obstacles and never move.
 * Returns the resolved top-left position for every box.
 */
export function separateBoxes(
  input: SeparatableBox[],
  gap: number,
): Map<string, { x: number; y: number }> {
  const boxes = input.map((box) => ({ ...box }));
  const result = new Map<string, { x: number; y: number }>();

  if (boxes.length < 2) {
    for (const box of boxes) {
      result.set(box.id, { x: box.x, y: box.y });
    }
    return result;
  }

  const maxIterations = Math.min(400, Math.max(48, boxes.length * 6));

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const aMovable = a.movable !== false;
        const bMovable = b.movable !== false;
        if (!aMovable && !bMovable) {
          continue;
        }
        const overlap = overlapAmounts(a, b, gap);
        if (overlap.x <= 0 || overlap.y <= 0) {
          continue;
        }

        const weightA = aMovable ? (bMovable ? 0.5 : 1) : 0;
        const weightB = bMovable ? (aMovable ? 0.5 : 1) : 0;

        if (overlap.x <= overlap.y) {
          const dir = a.x + a.width / 2 <= b.x + b.width / 2 ? -1 : 1;
          a.x += overlap.x * weightA * dir;
          b.x -= overlap.x * weightB * dir;
        } else {
          const dir = a.y + a.height / 2 <= b.y + b.height / 2 ? -1 : 1;
          a.y += overlap.y * weightA * dir;
          b.y -= overlap.y * weightB * dir;
        }
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }

  shelfPackConflicts(boxes, gap);

  for (const box of boxes) {
    result.set(box.id, { x: box.x, y: box.y });
  }
  return result;
}

/** Nudges overlapping table nodes apart until no pair collides. */
export function resolveNodeOverlaps(
  nodes: Node[],
  gap: number,
  movableIds?: Set<string>,
  anchorId?: string | null,
): Node[] {
  if (nodes.length < 2) {
    return nodes;
  }

  const boxes: SeparatableBox[] = nodes.map((node) => {
    const { width, height } = layoutNodeSize(node);
    return {
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width,
      height,
      movable:
        (!movableIds || movableIds.has(node.id)) &&
        (!anchorId || node.id !== anchorId),
    };
  });

  const positions = separateBoxes(boxes, gap);

  return nodes.map((node) => {
    const position = positions.get(node.id);
    if (
      !position ||
      (position.x === node.position.x && position.y === node.position.y)
    ) {
      return node;
    }
    return { ...node, position };
  });
}

/** Minimum ring radius so node centers are far enough apart on a circle. */
export function minRingRadius(
  nodeCount: number,
  maxNodeSpan: number,
  gap: number,
): number {
  if (nodeCount <= 1) {
    return 0;
  }
  const minCenterDistance = maxNodeSpan + gap;
  const sinHalf = Math.sin(Math.PI / nodeCount);
  if (sinHalf <= 0) {
    return minCenterDistance;
  }
  return minCenterDistance / (2 * sinHalf);
}

export function maxNodeSpan(node: Node, margin: number): number {
  const { width, height } = layoutNodeSize(node);
  return Math.max(width, height) + margin * 2;
}
