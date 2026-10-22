import type { Edge, Node } from "@xyflow/react";
import type { TableGroupNodeData } from "../../components/diagram/TableGroupNode";
import { NODE_WIDTH, tableNodeHeight } from "./dagre-layout";

export const GROUP_NODE_TYPE = "tableGroupNode";
export const GROUP_NODE_PREFIX = "group:";

export const GROUP_PADDING_X = 24;
export const GROUP_PADDING_TOP = 44;
export const GROUP_PADDING_BOTTOM = 24;
export const GROUP_NOTE_EXTRA_TOP = 24;

export function groupTopPadding(hasGroupNote = false): number {
  return GROUP_PADDING_TOP + (hasGroupNote ? GROUP_NOTE_EXTRA_TOP : 0);
}

export function groupNodeId(groupId: string): string {
  return `${GROUP_NODE_PREFIX}${groupId}`;
}

export function isGroupNode(node: Node): boolean {
  return (
    node.type === GROUP_NODE_TYPE || node.id.startsWith(GROUP_NODE_PREFIX)
  );
}

/**
 * Recomputes bounding boxes for all TableGroup nodes from their member tables'
 * current positions and places group nodes before table nodes so they render
 * underneath tables and edges.
 */
export function syncTableGroupBounds(nodes: Node[]): Node[] {
  const groupNodes: Node<TableGroupNodeData>[] = [];
  const tableNodes: Node[] = [];

  for (const node of nodes) {
    if (isGroupNode(node)) {
      groupNodes.push(node as Node<TableGroupNodeData>);
    } else {
      tableNodes.push(node);
    }
  }

  if (groupNodes.length === 0) {
    return nodes;
  }

  const tableById = new Map(tableNodes.map((n) => [n.id, n]));

  const updatedGroups = groupNodes.map((groupNode) => {
    const group = groupNode.data?.group;
    const memberNodes = (group?.tableIds ?? [])
      .map((id) => tableById.get(id))
      .filter((n): n is Node => Boolean(n));

    if (memberNodes.length === 0) {
      return {
        ...groupNode,
        hidden: true,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const member of memberNodes) {
      const width =
        member.measured?.width ?? member.width ?? NODE_WIDTH;
      const height =
        member.measured?.height ?? member.height ?? tableNodeHeight(member);
      minX = Math.min(minX, member.position.x);
      minY = Math.min(minY, member.position.y);
      maxX = Math.max(maxX, member.position.x + Number(width));
      maxY = Math.max(maxY, member.position.y + Number(height));
    }

    const topPad = groupTopPadding(Boolean(group.note?.trim()));
    const x = minX - GROUP_PADDING_X;
    const y = minY - topPad;
    const width = Math.max(240, maxX - minX + GROUP_PADDING_X * 2);
    const height = Math.max(120, maxY - minY + topPad + GROUP_PADDING_BOTTOM);

    return {
      ...groupNode,
      hidden: false,
      position: { x, y },
      width,
      height,
      style: {
        ...groupNode.style,
        width,
        height,
      },
      data: {
        ...groupNode.data,
        width,
        height,
      },
    };
  });

  return [...updatedGroups, ...tableNodes];
}

/**
 * Adds synthetic edges between consecutive tables in the same TableGroup so
 * auto-layout algorithms cluster grouped tables together even when they don't
 * share direct foreign-key references.
 */
export function buildGroupLayoutEdges(
  nodes: Node[],
  edges: Edge[],
): Edge[] {
  const byGroup = new Map<string, string[]>();
  for (const node of nodes) {
    if (isGroupNode(node)) {
      continue;
    }
    const groupId = (node.data as { table?: { groupId?: string } } | undefined)
      ?.table?.groupId;
    if (!groupId) {
      continue;
    }
    const list = byGroup.get(groupId) ?? [];
    list.push(node.id);
    byGroup.set(groupId, list);
  }

  if (byGroup.size === 0) {
    return edges;
  }

  for (const [groupId, memberIds] of byGroup) {
    memberIds.sort((a, b) => a.localeCompare(b));
    byGroup.set(groupId, memberIds);
  }

  const augmented = [...edges];
  for (const [groupId, memberIds] of byGroup) {
    for (let i = 0; i < memberIds.length - 1; i += 1) {
      augmented.push({
        id: `__group_edge__:${groupId}:${i}`,
        source: memberIds[i],
        target: memberIds[i + 1],
      });
    }
  }
  return augmented;
}
