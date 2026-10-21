import type { Edge, Node } from "@xyflow/react";
import { applyAlgorithmLayout } from "./layout-algorithms";
import { applyDagreLayoutAsync } from "./dagre-layout-async";
import type { AutoLayoutOptions } from "./layout-options";
import {
  buildGroupLayoutEdges,
  isGroupNode,
  syncTableGroupBounds,
} from "./table-group-bounds";

export async function applyAutoLayoutAsync(
  nodes: Node[],
  edges: Edge[] = [],
  options: AutoLayoutOptions,
): Promise<Node[]> {
  if (nodes.length === 0) {
    return nodes;
  }

  const groupNodes = nodes.filter(isGroupNode);
  const tableNodes = nodes.filter((n) => !isGroupNode(n));
  if (tableNodes.length === 0) {
    return nodes;
  }

  const layoutEdges = buildGroupLayoutEdges(tableNodes, edges);

  const laidOutTables =
    options.algorithm === "left-right"
      ? await applyDagreLayoutAsync(tableNodes, layoutEdges, {
          ...options,
          rankdir: "LR",
        })
      : applyAlgorithmLayout(tableNodes, layoutEdges, options);

  return syncTableGroupBounds([...groupNodes, ...laidOutTables]);
}
