import type { Edge, Node } from "@xyflow/react";
import type { TableGroupNodeData } from "../../components/diagram/TableGroupNode";
import { uniqueLayoutEdges } from "./dagre-layout";
import {
  componentForNode,
  filterEdgesForNodes,
  filterNodesByIds,
} from "./layout-graph";
import { buildGroupLayoutEdges, isGroupNode } from "./table-group-bounds";
import type { AutoLayoutOptions } from "./layout-options";
import {
  layoutNodeBounds as boundsFromNodes,
  layoutNodeSize,
} from "./layout-node-bounds";
import {
  insetTablesIntoGroupFrame,
  tableGroupOuterBox,
} from "./group-layout-bounds";
import { resolveNodeOverlaps, separateBoxes, spacingMetrics, type SeparatableBox } from "./layout-spacing";

export const LAYOUT_META_GROUP_PREFIX = "__layout_meta_group__:";

export { layoutNodeSize };

export type GroupLayoutHints = {
  groupHasNote: Map<string, boolean>;
};

export function groupLayoutHintsFromNodes(groupNodes: Node[]): GroupLayoutHints {
  const groupHasNote = new Map<string, boolean>();
  for (const node of groupNodes) {
    if (!isGroupNode(node)) {
      continue;
    }
    const group = (node.data as TableGroupNodeData | undefined)?.group;
    if (group?.id) {
      groupHasNote.set(group.id, Boolean(group.note?.trim()));
    }
  }
  return { groupHasNote };
}

export interface TableGroupMembership {
  groupId: string;
  memberIds: string[];
}

export function hasGroupedTables(nodes: Node[]): boolean {
  return nodes.some(
    (node) =>
      (node.data as { table?: { groupId?: string } } | undefined)?.table
        ?.groupId,
  );
}

export function collectTableGroupMemberships(nodes: Node[]): {
  memberships: TableGroupMembership[];
  memberToGroupId: Map<string, string>;
} {
  const byGroup = new Map<string, Set<string>>();
  const memberToGroupId = new Map<string, string>();

  for (const node of nodes) {
    const groupId = (node.data as { table?: { groupId?: string } } | undefined)
      ?.table?.groupId;
    if (!groupId) {
      continue;
    }
    memberToGroupId.set(node.id, groupId);
    const set = byGroup.get(groupId) ?? new Set<string>();
    set.add(node.id);
    byGroup.set(groupId, set);
  }

  const memberships: TableGroupMembership[] = [...byGroup.entries()]
    .map(([groupId, ids]) => ({
      groupId,
      memberIds: [...ids].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.groupId.localeCompare(b.groupId));

  return { memberships, memberToGroupId };
}

export function expandTargetIdsWithWholeGroups(
  targetIds: string[],
  memberships: TableGroupMembership[],
): string[] {
  const set = new Set(targetIds);
  for (const membership of memberships) {
    if (membership.memberIds.some((id) => set.has(id))) {
      for (const id of membership.memberIds) {
        set.add(id);
      }
    }
  }
  return [...set];
}

function shiftNodes(nodes: Node[], dx: number, dy: number): Node[] {
  return nodes.map((node) => ({
    ...node,
    position: { x: node.position.x + dx, y: node.position.y + dy },
  }));
}

export function normalizeNodePositions(nodes: Node[]): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }
  const { minX, minY } = boundsFromNodes(nodes, layoutNodeSize);
  if (minX === 0 && minY === 0) {
    return nodes;
  }
  return shiftNodes(nodes, -minX, -minY);
}

function createMetaGroupNode(
  groupId: string,
  width: number,
  height: number,
): Node {
  return {
    id: `${LAYOUT_META_GROUP_PREFIX}${groupId}`,
    type: "tableNode",
    position: { x: 0, y: 0 },
    width,
    height,
    data: { __layoutMeta: true },
  };
}

function buildMetaLevelEdges(
  edges: Edge[],
  memberToGroupId: Map<string, string>,
): Edge[] {
  const seen = new Set<string>();
  const metaEdges: Edge[] = [];
  for (const { source, target } of uniqueLayoutEdges(edges)) {
    const sourceGroup = memberToGroupId.get(source);
    const targetGroup = memberToGroupId.get(target);
    const metaSource = sourceGroup
      ? `${LAYOUT_META_GROUP_PREFIX}${sourceGroup}`
      : source;
    const metaTarget = targetGroup
      ? `${LAYOUT_META_GROUP_PREFIX}${targetGroup}`
      : target;
    if (metaSource === metaTarget) {
      continue;
    }
    const key = `${metaSource}\0${metaTarget}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    metaEdges.push({
      id: `__meta__:${key}`,
      source: metaSource,
      target: metaTarget,
    });
  }
  return metaEdges;
}

function expandMetaLayoutToTables(
  tableNodes: Node[],
  metaLaidOut: Node[],
  internalByGroup: Map<string, Node[]>,
  memberToGroupId: Map<string, string>,
): Node[] {
  const laidById = new Map(metaLaidOut.map((node) => [node.id, node]));
  const positioned = new Map<string, Node>();

  for (const node of tableNodes) {
    const groupId = memberToGroupId.get(node.id);
    if (!groupId) {
      positioned.set(node.id, laidById.get(node.id) ?? node);
      continue;
    }
    const internal = internalByGroup.get(groupId);
    const meta = laidById.get(`${LAYOUT_META_GROUP_PREFIX}${groupId}`);
    if (!internal || !meta) {
      positioned.set(node.id, node);
      continue;
    }
    const member = internal.find((n) => n.id === node.id);
    if (!member) {
      positioned.set(node.id, node);
      continue;
    }
    positioned.set(node.id, {
      ...member,
      position: {
        x: meta.position.x + member.position.x,
        y: meta.position.y + member.position.y,
      },
    });
  }

  return tableNodes.map((node) => positioned.get(node.id) ?? node);
}

export type FlatTableLayoutFn = (
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
) => Node[];

export type InternalGroupLayoutFn = (
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
) => Node[];

/**
 * Lays out grouped tables as rigid units: compact layout inside each group,
 * then runs the chosen auto-layout on group meta-nodes plus ungrouped tables.
 */
export function layoutTableNodesWithGroups(
  tableNodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
  flatLayout: FlatTableLayoutFn,
  internalGroupLayout: InternalGroupLayoutFn,
  hints?: GroupLayoutHints,
): Node[] {
  const { memberships, memberToGroupId } =
    collectTableGroupMemberships(tableNodes);
  if (memberships.length === 0) {
    return flatLayout(tableNodes, edges, options);
  }

  const layoutEdges = buildGroupLayoutEdges(tableNodes, edges);
  let targetIds = tableNodes.map((node) => node.id);
  if (options.scope === "selection") {
    if (!options.selectedNodeId) {
      return flatLayout(tableNodes, layoutEdges, options);
    }
    targetIds = componentForNode(
      options.selectedNodeId,
      targetIds,
      layoutEdges,
    );
    targetIds = expandTargetIdsWithWholeGroups(targetIds, memberships);
  }

  const targetIdSet = new Set(targetIds);
  const internalByGroup = new Map<string, Node[]>();
  const metaNodes: Node[] = [];
  const { margin } = spacingMetrics(options.spacing);

  for (const membership of memberships) {
    const memberSet = new Set(membership.memberIds);
    const members = filterNodesByIds(tableNodes, memberSet);
    if (members.length === 0) {
      continue;
    }
    const hasNote = hints?.groupHasNote.get(membership.groupId) ?? false;
    const internalEdges = filterEdgesForNodes(edges, memberSet);
    const internalOptions: AutoLayoutOptions = {
      ...options,
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    };
    let laidInternal =
      members.length === 1
        ? members
        : internalGroupLayout(members, internalEdges, internalOptions);
    if (members.length > 1) {
      laidInternal = resolveNodeOverlaps(laidInternal, margin);
    }
    const framed = insetTablesIntoGroupFrame(
      normalizeNodePositions(laidInternal),
      hasNote,
    );
    internalByGroup.set(membership.groupId, framed);

    const outer = tableGroupOuterBox(framed, hasNote);
    metaNodes.push(
      createMetaGroupNode(membership.groupId, outer.width, outer.height),
    );
  }

  const ungroupedTargets = tableNodes.filter(
    (node) =>
      !memberToGroupId.has(node.id) && targetIdSet.has(node.id),
  );
  const metaTargets = metaNodes.filter((node) => {
    const groupId = node.id.slice(LAYOUT_META_GROUP_PREFIX.length);
    return membershipTouchesTarget(groupId, memberships, targetIdSet);
  });

  const layoutMetaNodes = [...ungroupedTargets, ...metaTargets];
  if (layoutMetaNodes.length === 0) {
    return tableNodes;
  }

  const metaEdges = buildMetaLevelEdges(edges, memberToGroupId);
  const metaOptions: AutoLayoutOptions = {
    ...options,
    scope: "all",
    selectedNodeId: null,
  };

  let laidMeta = flatLayout(layoutMetaNodes, metaEdges, metaOptions);

  if (options.scope === "selection" && options.selectedNodeId) {
    const anchor = tableNodes.find((node) => node.id === options.selectedNodeId);
    const laidAnchor = laidMeta.find(
      (node) => node.id === options.selectedNodeId,
    );
    if (anchor && laidAnchor) {
      const dx = anchor.position.x - laidAnchor.position.x;
      const dy = anchor.position.y - laidAnchor.position.y;
      laidMeta = shiftNodes(laidMeta, dx, dy);
    } else if (anchor) {
      const groupId = memberToGroupId.get(options.selectedNodeId);
      if (groupId) {
        const metaId = `${LAYOUT_META_GROUP_PREFIX}${groupId}`;
        const laidGroup = laidMeta.find((node) => node.id === metaId);
        const internal = internalByGroup.get(groupId);
        const member = internal?.find(
          (node) => node.id === options.selectedNodeId,
        );
        if (laidGroup && member) {
          const dx =
            anchor.position.x - (laidGroup.position.x + member.position.x);
          const dy =
            anchor.position.y - (laidGroup.position.y + member.position.y);
          laidMeta = shiftNodes(laidMeta, dx, dy);
        }
      }
    }
  }

  let merged = expandMetaLayoutToTables(
    tableNodes,
    laidMeta,
    internalByGroup,
    memberToGroupId,
  );
  merged = resolveLayoutUnitCollisions(
    merged,
    memberships,
    memberToGroupId,
    hints,
    margin,
    options.scope === "selection" ? targetIdSet : undefined,
    options.scope === "selection" ? options.selectedNodeId : null,
  );

  if (options.scope === "selection") {
    const fixedIds = new Set(
      tableNodes
        .filter((node) => !targetIdSet.has(node.id))
        .map((node) => node.id),
    );
    if (fixedIds.size === 0) {
      return merged;
    }
    const mergedById = new Map(merged.map((node) => [node.id, node]));
    return tableNodes.map((node) =>
      fixedIds.has(node.id)
        ? tableNodes.find((n) => n.id === node.id) ?? node
        : (mergedById.get(node.id) ?? node),
    );
  }

  return merged;
}

function membershipTouchesTarget(
  groupId: string,
  memberships: TableGroupMembership[],
  targetIdSet: Set<string>,
): boolean {
  const membership = memberships.find((m) => m.groupId === groupId);
  if (!membership) {
    return false;
  }
  return membership.memberIds.some((id) => targetIdSet.has(id));
}

type LayoutUnit =
  | { kind: "solo"; id: string }
  | { kind: "group"; groupId: string; memberIds: string[] };

function resolveLayoutUnitCollisions(
  tableNodes: Node[],
  memberships: TableGroupMembership[],
  memberToGroupId: Map<string, string>,
  hints: GroupLayoutHints | undefined,
  gap: number,
  movableIds?: Set<string>,
  anchorId?: string | null,
): Node[] {
  if (tableNodes.length < 2) {
    return tableNodes;
  }

  const byId = new Map(tableNodes.map((node) => [node.id, node]));
  const units: LayoutUnit[] = [
    ...memberships
      .filter((membership) => membership.memberIds.length > 0)
      .map((membership) => ({
        kind: "group" as const,
        groupId: membership.groupId,
        memberIds: membership.memberIds,
      })),
    ...tableNodes
      .filter((node) => !memberToGroupId.has(node.id))
      .map((node) => ({ kind: "solo" as const, id: node.id })),
  ];

  const unitKey = (unit: LayoutUnit) =>
    unit.kind === "solo" ? `solo:${unit.id}` : `group:${unit.groupId}`;

  const boxes: SeparatableBox[] = [];
  for (const unit of units) {
    const isAnchor =
      anchorId != null &&
      (unit.kind === "solo"
        ? unit.id === anchorId
        : unit.memberIds.includes(anchorId));
    if (unit.kind === "solo") {
      const node = byId.get(unit.id);
      if (!node) {
        continue;
      }
      const size = layoutNodeSize(node);
      boxes.push({
        id: unitKey(unit),
        x: node.position.x,
        y: node.position.y,
        width: size.width,
        height: size.height,
        movable:
          !isAnchor && (movableIds ? movableIds.has(unit.id) : true),
      });
      continue;
    }
    const members = unit.memberIds
      .map((id) => byId.get(id))
      .filter((node): node is Node => Boolean(node));
    if (members.length === 0) {
      continue;
    }
    const outer = tableGroupOuterBox(
      members,
      hints?.groupHasNote.get(unit.groupId) ?? false,
    );
    boxes.push({
      id: unitKey(unit),
      ...outer,
      movable:
        !isAnchor &&
        (movableIds
          ? unit.memberIds.some((id) => movableIds.has(id))
          : true),
    });
  }

  const positions = separateBoxes(boxes, gap);
  const offsets = new Map<string, { dx: number; dy: number }>();
  for (const box of boxes) {
    const position = positions.get(box.id);
    if (!position) {
      continue;
    }
    offsets.set(box.id, {
      dx: position.x - box.x,
      dy: position.y - box.y,
    });
  }

  return tableNodes.map((node) => {
    const groupId = memberToGroupId.get(node.id);
    const offset = offsets.get(
      groupId ? `group:${groupId}` : `solo:${node.id}`,
    );
    if (!offset || (offset.dx === 0 && offset.dy === 0)) {
      return node;
    }
    return {
      ...node,
      position: {
        x: node.position.x + offset.dx,
        y: node.position.y + offset.dy,
      },
    };
  });
}
