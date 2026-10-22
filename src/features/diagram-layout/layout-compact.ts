import type { Node } from "@xyflow/react";
import type { LayoutSpacing } from "../../stores/diagram-view-store";
import { spacingMetrics } from "./layout-spacing";
import { layoutNodeSize } from "./layout-node-bounds";

export function layoutCompactTables(
  nodes: Node[],
  spacing: LayoutSpacing = "default",
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }
  const metrics = spacingMetrics(spacing);
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const rows = Math.ceil(sorted.length / cols);

  const colWidths = new Array<number>(cols).fill(0);
  const rowHeights = new Array<number>(rows).fill(0);
  const sizes = new Map(
    sorted.map((node) => [node.id, layoutNodeSize(node)]),
  );

  for (let index = 0; index < sorted.length; index++) {
    const size = sizes.get(sorted[index].id)!;
    const row = Math.floor(index / cols);
    const col = index % cols;
    colWidths[col] = Math.max(colWidths[col], size.width);
    rowHeights[row] = Math.max(rowHeights[row], size.height);
  }

  const colOffsets: number[] = [];
  let x = 0;
  for (let col = 0; col < cols; col++) {
    colOffsets.push(x);
    x += colWidths[col] + metrics.colGap;
  }

  const positioned: Node[] = [];
  let y = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      if (index >= sorted.length) {
        break;
      }
      positioned.push({
        ...sorted[index],
        position: { x: colOffsets[col], y },
      });
    }
    y += rowHeights[row] + metrics.rowGap;
  }

  return positioned;
}
