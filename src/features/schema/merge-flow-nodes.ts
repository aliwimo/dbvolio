import type { Node } from "@xyflow/react";
import type { TableNodeData } from "../../components/diagram/TableNode";
import type { TableGroupNodeData } from "../../components/diagram/TableGroupNode";
import { isGroupNode } from "../diagram-layout/table-group-bounds";

function tableDataEqual(a: TableNodeData, b: TableNodeData): boolean {
  if (a.table !== b.table) {
    return false;
  }
  if (a.foreignKeys !== b.foreignKeys) {
    return false;
  }
  if (a.refSourceColumns !== b.refSourceColumns) {
    return false;
  }
  if (a.refTargetColumns !== b.refTargetColumns) {
    return false;
  }
  return (
    (a.dimmed ?? false) === (b.dimmed ?? false) &&
    (a as { headerColor?: string }).headerColor ===
      (b as { headerColor?: string }).headerColor
  );
}

function groupDataEqual(a: TableGroupNodeData, b: TableGroupNodeData): boolean {
  return (
    a.group === b.group &&
    a.width === b.width &&
    a.height === b.height &&
    (a.dimmed ?? false) === (b.dimmed ?? false)
  );
}

/** Keeps stable node references when parse/layout did not change meaningful data. */
export function mergeFlowNodes(previous: Node[], next: Node[]): Node[] {
  if (previous.length === 0) {
    return next;
  }
  const prevById = new Map(previous.map((node) => [node.id, node]));
  return next.map((node) => {
    const old = prevById.get(node.id);
    if (!old) {
      return node;
    }
    const sameGeometry =
      old.position.x === node.position.x &&
      old.position.y === node.position.y &&
      old.type === node.type &&
      old.hidden === node.hidden;
    if (!sameGeometry) {
      return node;
    }
    if (isGroupNode(node)) {
      return groupDataEqual(
        old.data as TableGroupNodeData,
        node.data as TableGroupNodeData,
      )
        ? old
        : node;
    }
    if (
      tableDataEqual(
        old.data as TableNodeData,
        node.data as TableNodeData,
      )
    ) {
      return old;
    }
    return node;
  });
}
