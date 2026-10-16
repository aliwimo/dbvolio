import type { Node } from "@xyflow/react";
import type { LayoutSpacing } from "../../stores/diagram-view-store";
import { NODE_WIDTH, tableNodeHeight } from "./dagre-layout";

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
  const height = tableNodeHeight(node);
  return {
    id: node.id,
    x: node.position.x - margin,
    y: node.position.y - margin,
    width: NODE_WIDTH + margin * 2,
    height: height + margin * 2,
  };
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap: number,
): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

/** Nudge overlapping table nodes apart (same component layouts). */
export function resolveNodeOverlaps(
  nodes: Node[],
  gap: number,
): Node[] {
  if (nodes.length < 2) {
    return nodes;
  }

  const positions = new Map(
    nodes.map((node) => [node.id, { ...node.position }]),
  );
  const maxIterations = Math.min(48, nodes.length * 6);

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const aNode = nodes[i];
        const bNode = nodes[j];
        const aPos = positions.get(aNode.id)!;
        const bPos = positions.get(bNode.id)!;

        const a = {
          x: aPos.x,
          y: aPos.y,
          width: NODE_WIDTH,
          height: tableNodeHeight(aNode),
        };
        const b = {
          x: bPos.x,
          y: bPos.y,
          width: NODE_WIDTH,
          height: tableNodeHeight(bNode),
        };

        if (!boxesOverlap(a, b, gap)) {
          continue;
        }

        const overlapX =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) + gap;
        const overlapY =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) + gap;

        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }

        if (overlapX < overlapY) {
          const push = overlapX / 2;
          const dir = aPos.x + a.width / 2 <= bPos.x + b.width / 2 ? -1 : 1;
          aPos.x -= push * dir;
          bPos.x += push * dir;
        } else {
          const push = overlapY / 2;
          const dir = aPos.y + a.height / 2 <= bPos.y + b.height / 2 ? -1 : 1;
          aPos.y -= push * dir;
          bPos.y += push * dir;
        }
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }

  return nodes.map((node) => {
    const position = positions.get(node.id);
    return position ? { ...node, position } : node;
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
  const height = tableNodeHeight(node);
  return Math.max(NODE_WIDTH, height) + margin * 2;
}
