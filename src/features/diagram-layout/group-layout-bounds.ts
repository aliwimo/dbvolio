import type { Node } from "@xyflow/react";
import {
  GROUP_PADDING_BOTTOM,
  GROUP_PADDING_X,
  groupTopPadding,
} from "./table-group-bounds";
import { layoutNodeBounds } from "./layout-node-bounds";
import { layoutNodeSize } from "./layout-node-bounds";

export function tableGroupOuterBox(
  members: Node[],
  hasGroupNote = false,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const topPad = groupTopPadding(hasGroupNote);
  if (members.length === 0) {
    return { x: 0, y: 0, width: 240, height: 120 };
  }
  const tableBounds = layoutNodeBounds(members, layoutNodeSize);
  const spanX = tableBounds.maxX - tableBounds.minX;
  const spanY = tableBounds.maxY - tableBounds.minY;
  return {
    x: tableBounds.minX - GROUP_PADDING_X,
    y: tableBounds.minY - topPad,
    width: Math.max(240, spanX + GROUP_PADDING_X * 2),
    height: Math.max(120, spanY + topPad + GROUP_PADDING_BOTTOM),
  };
}

/** Positions member tables inside a group meta-node (origin = outer top-left). */
export function insetTablesIntoGroupFrame(
  members: Node[],
  hasGroupNote = false,
): Node[] {
  const topPad = groupTopPadding(hasGroupNote);
  const tableBounds = layoutNodeBounds(members, layoutNodeSize);
  const dx = GROUP_PADDING_X - tableBounds.minX;
  const dy = topPad - tableBounds.minY;
  if (dx === 0 && dy === 0) {
    return members;
  }
  return members.map((node) => ({
    ...node,
    position: {
      x: node.position.x + dx,
      y: node.position.y + dy,
    },
  }));
}
