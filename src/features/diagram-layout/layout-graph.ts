import type { Edge, Node } from "@xyflow/react";
import { uniqueLayoutEdges } from "./dagre-layout";

export function connectedComponents(
  nodeIds: string[],
  edges: Edge[],
): string[][] {
  if (nodeIds.length === 0) {
    return [];
  }

  const idSet = new Set(nodeIds);
  const adj = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    adj.set(id, new Set());
  }
  for (const { source, target } of uniqueLayoutEdges(edges)) {
    if (!idSet.has(source) || !idSet.has(target)) {
      continue;
    }
    adj.get(source)!.add(target);
    adj.get(target)!.add(source);
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const id of nodeIds) {
    if (visited.has(id)) {
      continue;
    }
    const stack = [id];
    const component: string[] = [];
    visited.add(id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const neighbor of adj.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

export function componentForNode(
  nodeId: string,
  nodeIds: string[],
  edges: Edge[],
): string[] {
  for (const component of connectedComponents(nodeIds, edges)) {
    if (component.includes(nodeId)) {
      return component;
    }
  }
  return [nodeId];
}

export function filterNodesByIds(nodes: Node[], ids: Set<string>): Node[] {
  return nodes.filter((node) => ids.has(node.id));
}

export function filterEdgesForNodes(edges: Edge[], nodeIds: Set<string>): Edge[] {
  return edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );
}
