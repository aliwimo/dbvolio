import type { Edge, Node } from "@xyflow/react";
import { applyAlgorithmLayout } from "./layout-algorithms";
import { applyDagreLayoutAsync } from "./dagre-layout-async";
import type { AutoLayoutOptions } from "./layout-options";

export async function applyAutoLayoutAsync(
  nodes: Node[],
  edges: Edge[] = [],
  options: AutoLayoutOptions,
): Promise<Node[]> {
  if (nodes.length === 0) {
    return nodes;
  }

  if (options.algorithm === "left-right") {
    return applyDagreLayoutAsync(nodes, edges, {
      ...options,
      rankdir: "LR",
    });
  }

  return applyAlgorithmLayout(nodes, edges, options);
}
