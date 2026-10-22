import type { Node } from "@xyflow/react";
import { NODE_WIDTH, tableNodeHeight } from "./dagre-layout";

export function layoutNodeSize(node: Node): { width: number; height: number } {
  if ((node.data as { __layoutMeta?: boolean } | undefined)?.__layoutMeta) {
    return {
      width: Number(node.width ?? 240),
      height: Number(node.height ?? 120),
    };
  }
  const width = Number(
    node.measured?.width ?? node.width ?? NODE_WIDTH,
  );
  const height = Number(
    node.measured?.height ?? node.height ?? tableNodeHeight(node),
  );
  return {
    width: width > 0 ? width : NODE_WIDTH,
    height: height > 0 ? height : tableNodeHeight(node),
  };
}

export function layoutNodeBounds(
  nodes: Node[],
  sizeFor: (node: Node) => { width: number; height: number },
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const { width, height } = sizeFor(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}
