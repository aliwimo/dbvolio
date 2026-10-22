import type { Edge, Node } from "@xyflow/react";
import {
  componentForNode,
  connectedComponents,
  filterEdgesForNodes,
  filterNodesByIds,
} from "./layout-graph";
import type { AutoLayoutOptions } from "./layout-options";
import {
  maxNodeSpan,
  minRingRadius,
  resolveNodeOverlaps,
  spacingMetrics,
} from "./layout-spacing";
import { layoutCompactTables } from "./layout-compact";
import {
  groupLayoutHintsFromNodes,
  hasGroupedTables,
  layoutNodeSize,
  layoutTableNodesWithGroups,
} from "./group-layout";
import { layoutNodeBounds as sharedLayoutNodeBounds } from "./layout-node-bounds";
import { uniqueLayoutEdges } from "./dagre-layout";
import {
  buildGroupLayoutEdges,
  isGroupNode,
  syncTableGroupBounds,
} from "./table-group-bounds";

function mergeLayoutIntoNodes(allNodes: Node[], laidOut: Node[]): Node[] {
  const byId = new Map(laidOut.map((node) => [node.id, node]));
  return allNodes.map((node) => byId.get(node.id) ?? node);
}

function shiftNodes(nodes: Node[], dx: number, dy: number): Node[] {
  return nodes.map((node) => ({
    ...node,
    position: { x: node.position.x + dx, y: node.position.y + dy },
  }));
}

function layoutNodeBounds(nodes: Node[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  return sharedLayoutNodeBounds(nodes, layoutNodeSize);
}

function packGroups(
  groups: Node[][],
  horizontal: boolean,
  gap: number,
): Node[] {
  if (groups.length === 0) {
    return [];
  }
  let offset = 0;
  const packed: Node[] = [];
  for (const group of groups) {
    const bounds = layoutNodeBounds(group);
    const dx = horizontal ? offset - bounds.minX : 0;
    const dy = horizontal ? 0 : offset - bounds.minY;
    packed.push(...shiftNodes(group, dx, dy));
    const span = horizontal
      ? bounds.maxX - bounds.minX
      : bounds.maxY - bounds.minY;
    offset += span + gap;
  }
  return packed;
}

function resolveTargetNodes(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
): { targetNodes: Node[]; targetEdges: Edge[]; fixedNodes: Node[] } {
  let targetIds = nodes.map((node) => node.id);
  if (options.scope === "selection" && options.selectedNodeId) {
    targetIds = componentForNode(options.selectedNodeId, targetIds, edges);
  }
  const targetIdSet = new Set(targetIds);
  return {
    targetNodes: filterNodesByIds(nodes, targetIdSet),
    targetEdges: filterEdgesForNodes(edges, targetIdSet),
    fixedNodes: nodes.filter((node) => !targetIdSet.has(node.id)),
  };
}

function anchorSelectionLayout(
  allNodes: Node[],
  laidOutTargets: Node[],
  selectedNodeId: string | null,
  scope: AutoLayoutOptions["scope"],
): Node[] {
  if (scope !== "selection" || !selectedNodeId) {
    return laidOutTargets;
  }
  const anchor = allNodes.find((node) => node.id === selectedNodeId);
  const laidAnchor = laidOutTargets.find((node) => node.id === selectedNodeId);
  if (!anchor || !laidAnchor) {
    return laidOutTargets;
  }
  const dx = anchor.position.x - laidAnchor.position.x;
  const dy = anchor.position.y - laidAnchor.position.y;
  return shiftNodes(laidOutTargets, dx, dy);
}

/** Longest-path layering on FK edges (source → target), left to right. */
function pipelineLayers(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
): Map<string, number> {
  const idSet = new Set(nodeIds);
  const preds = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    preds.set(id, new Set());
  }
  for (const { source, target } of edges) {
    if (!idSet.has(source) || !idSet.has(target) || source === target) {
      continue;
    }
    preds.get(target)!.add(source);
  }

  const layer = new Map<string, number>();
  for (const id of nodeIds) {
    layer.set(id, preds.get(id)!.size === 0 ? 0 : -1);
  }

  let changed = true;
  let guard = nodeIds.length + 2;
  while (changed && guard-- > 0) {
    changed = false;
    for (const id of nodeIds) {
      const predecessors = preds.get(id)!;
      let next = 0;
      for (const pred of predecessors) {
        next = Math.max(next, (layer.get(pred) ?? 0) + 1);
      }
      if ((layer.get(id) ?? 0) !== next) {
        layer.set(id, next);
        changed = true;
      }
    }
  }

  for (const id of nodeIds) {
    if ((layer.get(id) ?? -1) < 0) {
      layer.set(id, 0);
    }
  }
  return layer;
}

function layoutPipelineSubset(
  nodes: Node[],
  edges: Edge[],
  spacing: AutoLayoutOptions["spacing"],
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }
  const metrics = spacingMetrics(spacing);
  const nodeIds = nodes.map((node) => node.id);
  const uniqueEdges = uniqueLayoutEdges(edges);
  const layers = pipelineLayers(nodeIds, uniqueEdges);

  const byLayer = new Map<number, Node[]>();
  for (const node of nodes) {
    const rank = layers.get(node.id) ?? 0;
    const group = byLayer.get(rank) ?? [];
    group.push(node);
    byLayer.set(rank, group);
  }

  const sortedLayers = [...byLayer.keys()].sort((a, b) => a - b);
  const positioned: Node[] = [];

  let x = 0;
  for (const rank of sortedLayers) {
    const group = [...(byLayer.get(rank) ?? [])].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    let y = 0;
    let layerWidth = 0;
    for (const node of group) {
      const size = layoutNodeSize(node);
      positioned.push({
        ...node,
        position: { x, y },
      });
      y += size.height + metrics.stackGap;
      layerWidth = Math.max(layerWidth, size.width);
    }
    x += layerWidth + metrics.rankGap;
  }

  return positioned;
}

function layoutSnowflakeSubset(
  nodes: Node[],
  edges: Edge[],
  spacing: AutoLayoutOptions["spacing"],
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }
  if (nodes.length === 1) {
    return [{ ...nodes[0], position: { x: 0, y: 0 } }];
  }

  const metrics = spacingMetrics(spacing);
  const idSet = new Set(nodes.map((node) => node.id));
  const degree = new Map<string, number>();
  for (const id of idSet) {
    degree.set(id, 0);
  }
  const adj = new Map<string, Set<string>>();
  for (const id of idSet) {
    adj.set(id, new Set());
  }
  for (const { source, target } of uniqueLayoutEdges(edges)) {
    if (!idSet.has(source) || !idSet.has(target)) {
      continue;
    }
    adj.get(source)!.add(target);
    adj.get(target)!.add(source);
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  }

  let hubId = nodes[0].id;
  let hubDegree = -1;
  for (const [id, d] of degree) {
    if (d > hubDegree || (d === hubDegree && id.localeCompare(hubId) < 0)) {
      hubDegree = d;
      hubId = id;
    }
  }

  const dist = new Map<string, number>();
  dist.set(hubId, 0);
  const queue = [hubId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = dist.get(current) ?? 0;
    for (const neighbor of adj.get(current) ?? []) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    }
  }
  for (const node of nodes) {
    if (!dist.has(node.id)) {
      dist.set(node.id, (dist.get(hubId) ?? 0) + 1);
    }
  }

  const byRing = new Map<number, Node[]>();
  for (const node of nodes) {
    const ring = dist.get(node.id) ?? 0;
    const group = byRing.get(ring) ?? [];
    group.push(node);
    byRing.set(ring, group);
  }

  const hub = nodes.find((node) => node.id === hubId)!;
  const hubSize = layoutNodeSize(hub);
  const positioned = new Map<string, { x: number; y: number }>();
  positioned.set(hubId, {
    x: -hubSize.width / 2,
    y: -hubSize.height / 2,
  });

  const rings = [...byRing.keys()].filter((r) => r > 0).sort((a, b) => a - b);
  let outerRadius =
    Math.max(hubSize.width, hubSize.height) / 2 +
    metrics.margin +
    metrics.ringPadding;

  for (const ring of rings) {
    const group = [...(byRing.get(ring) ?? [])].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const count = group.length;
    const maxSpan = Math.max(
      ...group.map((node) => maxNodeSpan(node, metrics.margin)),
    );
    const ringRadius = Math.max(
      outerRadius + maxSpan / 2,
      minRingRadius(count, maxSpan, metrics.stackGap),
    );

    for (let i = 0; i < count; i++) {
      const node = group[i];
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const cx = ringRadius * Math.cos(angle);
      const cy = ringRadius * Math.sin(angle);
      const size = layoutNodeSize(node);
      positioned.set(node.id, {
        x: cx - size.width / 2,
        y: cy - size.height / 2,
      });
    }

    outerRadius = ringRadius + maxSpan / 2 + metrics.ringPadding;
  }

  return nodes.map((node) => ({
    ...node,
    position: positioned.get(node.id) ?? { x: 0, y: 0 },
  }));
}

function layoutSubsetByAlgorithm(
  algorithm: AutoLayoutOptions["algorithm"],
  nodes: Node[],
  edges: Edge[],
  spacing: AutoLayoutOptions["spacing"],
): Node[] {
  switch (algorithm) {
    case "pipeline":
      return layoutPipelineSubset(nodes, edges, spacing);
    case "snowflake":
      return layoutSnowflakeSubset(nodes, edges, spacing);
    case "compact":
      return layoutCompactTables(nodes, spacing);
    case "left-right":
      return nodes;
  }
}

function applyAlgorithmLayoutFlatTables(
  tableNodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
): Node[] {
  if (tableNodes.length === 0) {
    return tableNodes;
  }
  const layoutEdges = buildGroupLayoutEdges(tableNodes, edges);
  const metrics = spacingMetrics(options.spacing);

  const { targetNodes, targetEdges, fixedNodes } = resolveTargetNodes(
    tableNodes,
    layoutEdges,
    options,
  );
  const targetIdSet = new Set(targetNodes.map((node) => node.id));

  let laidOutTargets: Node[];

  if (options.separateComponents && options.scope === "all") {
    const components = connectedComponents(
      targetNodes.map((node) => node.id),
      targetEdges,
    );
    const groups = components.map((ids) => {
      const idSet = new Set(ids);
      const subset = filterNodesByIds(targetNodes, idSet);
      const subsetEdges = filterEdgesForNodes(targetEdges, idSet);
      return layoutSubsetByAlgorithm(
        options.algorithm,
        subset,
        subsetEdges,
        options.spacing,
      );
    });
    const horizontal = options.algorithm !== "compact";
    laidOutTargets = packGroups(
      groups,
      horizontal,
      horizontal ? metrics.componentGap : metrics.componentGap * 0.85,
    );
  } else {
    laidOutTargets = layoutSubsetByAlgorithm(
      options.algorithm,
      targetNodes,
      targetEdges,
      options.spacing,
    );
  }

  laidOutTargets = anchorSelectionLayout(
    tableNodes,
    laidOutTargets,
    options.selectedNodeId,
    options.scope,
  );

  const resolved = resolveNodeOverlaps(
    [...fixedNodes, ...laidOutTargets],
    metrics.margin,
    options.scope === "selection" ? targetIdSet : undefined,
    options.scope === "selection" ? options.selectedNodeId : null,
  );
  return mergeLayoutIntoNodes(tableNodes, resolved);
}

export function applyAlgorithmLayout(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const groupNodes = nodes.filter(isGroupNode);
  const tableNodes = nodes.filter((n) => !isGroupNode(n));
  if (tableNodes.length === 0) {
    return nodes;
  }

  const groupHints = groupLayoutHintsFromNodes(groupNodes);
  const laidOutTables = hasGroupedTables(tableNodes)
    ? layoutTableNodesWithGroups(
        tableNodes,
        edges,
        options,
        applyAlgorithmLayoutFlatTables,
        (members, memberEdges, memberOptions) => {
          if (members.length <= 1) {
            return members;
          }
          if (memberEdges.length === 0) {
            return layoutCompactTables(members, memberOptions.spacing);
          }
          return layoutSubsetByAlgorithm(
            memberOptions.algorithm,
            members,
            memberEdges,
            memberOptions.spacing,
          );
        },
        groupHints,
      )
    : applyAlgorithmLayoutFlatTables(tableNodes, edges, options);

  return syncTableGroupBounds([...groupNodes, ...laidOutTables]);
}
