import dagre from "dagre";
import type {
  LayoutDirection,
  LayoutSpacing,
} from "../../stores/diagram-view-store";

export interface DagreLayoutNodeInput {
  id: string;
  width: number;
  height: number;
}

export interface DagreLayoutEdgeInput {
  source: string;
  target: string;
}

export interface DagreLayoutInput {
  nodes: DagreLayoutNodeInput[];
  edges: DagreLayoutEdgeInput[];
  rankdir: LayoutDirection;
  spacing?: LayoutSpacing;
}

export function spacingForRankdir(
  rankdir: LayoutDirection,
  spacing: LayoutSpacing = "default",
): { nodesep: number; ranksep: number } {
  const vertical = rankdir === "TB" || rankdir === "BT";
  const presets = {
    compact: vertical ? { nodesep: 36, ranksep: 48 } : { nodesep: 44, ranksep: 56 },
    default: vertical ? { nodesep: 50, ranksep: 70 } : { nodesep: 60, ranksep: 80 },
    relaxed: vertical ? { nodesep: 72, ranksep: 96 } : { nodesep: 84, ranksep: 110 },
  } as const;
  return presets[spacing];
}

/** Dagre node center coordinates keyed by node id. */
export type DagreLayoutPositions = Record<string, { x: number; y: number }>;

export function computeDagreLayout(input: DagreLayoutInput): DagreLayoutPositions {
  const { nodes, edges, rankdir, spacing = "default" } = input;
  if (nodes.length === 0) {
    return {};
  }

  const { nodesep, ranksep } = spacingForRankdir(rankdir, spacing);

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir,
    nodesep,
    ranksep,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: node.width, height: node.height });
  }
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const positions: DagreLayoutPositions = {};
  for (const node of nodes) {
    const layoutNode = graph.node(node.id);
    if (layoutNode) {
      positions[node.id] = { x: layoutNode.x, y: layoutNode.y };
    }
  }
  return positions;
}
