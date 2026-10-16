import type { Edge, Node } from "@xyflow/react";
import type { LayoutDirection, LayoutSpacing } from "../../stores/diagram-view-store";
import type { TableNodeData } from "../../components/diagram/TableNode";
import {
  computeDagreLayout,
  type DagreLayoutInput,
  type DagreLayoutPositions,
} from "./dagre-layout-core";
import {
  componentForNode,
  connectedComponents,
  filterEdgesForNodes,
  filterNodesByIds,
} from "./layout-graph";
import type { AutoLayoutOptions } from "./layout-options";
import { resolveNodeOverlaps, spacingMetrics } from "./layout-spacing";

const NODE_WIDTH = 260;
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 26;
const NODE_PADDING = 8;

export function estimateTableNodeHeight(columnCount: number): number {
  return HEADER_HEIGHT + columnCount * ROW_HEIGHT + NODE_PADDING;
}

export function tableNodeHeight(node: Node): number {
  const data = node.data as TableNodeData | undefined;
  const columns = data?.table?.columns?.length ?? 3;
  return estimateTableNodeHeight(columns);
}

/** One edge per source→target pair; duplicate column-level edges only slow Dagre. */
export function uniqueLayoutEdges(edges: Edge[]): Array<{
  source: string;
  target: string;
}> {
  const seen = new Set<string>();
  const unique: Array<{ source: string; target: string }> = [];
  for (const edge of edges) {
    const key = `${edge.source}\0${edge.target}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push({ source: edge.source, target: edge.target });
  }
  return unique;
}

export function buildDagreLayoutInput(
  nodes: Node[],
  edges: Edge[],
  rankdir: LayoutDirection,
  spacing: LayoutSpacing = "default",
): DagreLayoutInput {
  return {
    rankdir,
    spacing,
    nodes: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: tableNodeHeight(node),
    })),
    edges: uniqueLayoutEdges(edges),
  };
}

function layoutNodeBounds(nodes: Node[]): {
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
    const height = tableNodeHeight(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, node.position.y + height);
  }
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

function shiftNodes(nodes: Node[], dx: number, dy: number): Node[] {
  return nodes.map((node) => ({
    ...node,
    position: { x: node.position.x + dx, y: node.position.y + dy },
  }));
}

function layoutNodeSubset(
  nodes: Node[],
  edges: Edge[],
  rankdir: LayoutDirection,
  spacing: LayoutSpacing,
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }
  const input = buildDagreLayoutInput(nodes, edges, rankdir, spacing);
  const positions = computeDagreLayout(input);
  return positionsToNodes(nodes, positions);
}

function packComponentLayouts(
  laidOutGroups: Node[][],
  rankdir: LayoutDirection,
  spacing: LayoutSpacing = "default",
): Node[] {
  if (laidOutGroups.length === 0) {
    return [];
  }
  const { componentGap } = spacingMetrics(spacing);
  const gap =
    rankdir === "TB" || rankdir === "BT"
      ? componentGap * 0.75
      : componentGap;
  const verticalPack = rankdir === "TB" || rankdir === "BT";
  let offset = 0;
  const packed: Node[] = [];

  for (const group of laidOutGroups) {
    const bounds = layoutNodeBounds(group);
    const dx = verticalPack ? 0 : offset - bounds.minX;
    const dy = verticalPack ? offset - bounds.minY : 0;
    packed.push(...shiftNodes(group, dx, dy));
    const span = verticalPack
      ? bounds.maxY - bounds.minY
      : bounds.maxX - bounds.minX;
    offset += span + gap;
  }

  return packed;
}

function mergeLayoutIntoNodes(allNodes: Node[], laidOut: Node[]): Node[] {
  const byId = new Map(laidOut.map((node) => [node.id, node]));
  return allNodes.map((node) => byId.get(node.id) ?? node);
}

export function applyDagreLayoutWithOptions(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const { rankdir, spacing, scope, selectedNodeId, separateComponents } =
    options;

  let targetIds = nodes.map((node) => node.id);
  if (scope === "selection" && selectedNodeId) {
    targetIds = componentForNode(selectedNodeId, targetIds, edges);
  }

  const targetIdSet = new Set(targetIds);
  const targetNodes = filterNodesByIds(nodes, targetIdSet);
  const targetEdges = filterEdgesForNodes(edges, targetIdSet);
  const fixedNodes = nodes.filter((node) => !targetIdSet.has(node.id));

  let laidOutTargets: Node[];

  if (separateComponents && scope === "all") {
    const components = connectedComponents(
      targetNodes.map((node) => node.id),
      targetEdges,
    );
    const groups = components.map((ids) => {
      const idSet = new Set(ids);
      const subset = filterNodesByIds(targetNodes, idSet);
      const subsetEdges = filterEdgesForNodes(targetEdges, idSet);
      return layoutNodeSubset(subset, subsetEdges, rankdir, spacing);
    });
    laidOutTargets = packComponentLayouts(groups, rankdir, spacing);
  } else if (separateComponents && scope === "selection") {
    laidOutTargets = layoutNodeSubset(
      targetNodes,
      targetEdges,
      rankdir,
      spacing,
    );
  } else {
    laidOutTargets = layoutNodeSubset(
      targetNodes,
      targetEdges,
      rankdir,
      spacing,
    );
  }

  if (scope === "selection" && selectedNodeId && fixedNodes.length > 0) {
    const anchor = nodes.find((node) => node.id === selectedNodeId);
    const laidAnchor = laidOutTargets.find(
      (node) => node.id === selectedNodeId,
    );
    if (anchor && laidAnchor) {
      const dx = anchor.position.x - laidAnchor.position.x;
      const dy = anchor.position.y - laidAnchor.position.y;
      laidOutTargets = shiftNodes(laidOutTargets, dx, dy);
    }
  }

  const { margin } = spacingMetrics(spacing);
  laidOutTargets = resolveNodeOverlaps(laidOutTargets, margin);

  return mergeLayoutIntoNodes(nodes, [...fixedNodes, ...laidOutTargets]);
}

export function positionsToNodes(
  nodes: Node[],
  positions: DagreLayoutPositions,
): Node[] {
  return nodes.map((node) => {
    const center = positions[node.id];
    if (!center) {
      return node;
    }
    const height = tableNodeHeight(node);
    return {
      ...node,
      position: {
        x: center.x - NODE_WIDTH / 2,
        y: center.y - height / 2,
      },
    };
  });
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[] = [],
  rankdir: LayoutDirection = "LR",
  spacing: LayoutSpacing = "default",
): Node[] {
  return applyDagreLayoutWithOptions(nodes, edges, {
    algorithm: "left-right",
    rankdir,
    spacing,
    scope: "all",
    selectedNodeId: null,
    separateComponents: false,
  });
}

const NODE_HEIGHT = estimateTableNodeHeight(3);

export { NODE_WIDTH, NODE_HEIGHT };
