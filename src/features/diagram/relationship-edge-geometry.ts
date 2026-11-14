import type { Edge, Node } from "../../types/flow";
import type { TableNodeData } from "../../components/diagram/TableNode";
import { isGroupNode } from "../diagram-layout/table-group-bounds";
import { columnFromHandle } from "./column-handle-id";

/** Matches `.table-node` width in workspace.css */
export const TABLE_NODE_WIDTH = 260;
/** Header: 13px type at 1.45 line-height, 8px padding, 1px border. */
export const TABLE_HEADER_HEIGHT = 36;
export const TABLE_COLUMNS_PADDING = 4;
/** Row min-height is 26px and includes its padding (border-box). */
export const TABLE_ROW_STRIDE = 26;

export function tableNodeDimensions(node: Node): { width: number; height: number } {
  const width = node.width ?? node.measured?.width ?? TABLE_NODE_WIDTH;
  if (isGroupNode(node)) {
    const data = node.data as { height?: number; width?: number };
    const height =
      node.height ?? node.measured?.height ?? data.height ?? 200;
    return { width: Number(width), height: Number(height) };
  }
  const data = node.data as TableNodeData;
  const columnCount = data.table?.columns?.length ?? 0;
  const fallbackHeight =
    TABLE_HEADER_HEIGHT +
    TABLE_COLUMNS_PADDING * 2 +
    columnCount * TABLE_ROW_STRIDE;
  const height = node.height ?? node.measured?.height ?? fallbackHeight;
  return { width: Number(width), height: Number(height) };
}

function columnIndexForHandle(
  node: Node,
  handleId: string | null | undefined,
  fallbackColumn?: string | null,
): number {
  const data = node.data as TableNodeData | undefined;
  const columns = data?.table?.columns ?? [];
  const columnName =
    columnFromHandle(handleId) || fallbackColumn || "";
  if (!columnName) {
    return -1;
  }
  return columns.findIndex((c) => c.name === columnName);
}

export function columnHandleOffsetY(
  node: Node,
  handleId: string | null | undefined,
  fallbackColumn?: string | null,
): number {
  const idx = columnIndexForHandle(node, handleId, fallbackColumn);
  if (idx < 0) {
    const { height } = tableNodeDimensions(node);
    return height / 2;
  }
  return (
    TABLE_HEADER_HEIGHT +
    TABLE_COLUMNS_PADDING +
    idx * TABLE_ROW_STRIDE +
    TABLE_ROW_STRIDE / 2
  );
}

export type RelationshipEdgePoints = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceSide: "left" | "right";
  targetSide: "left" | "right";
};

function columnFromEdge(
  edge: Edge,
  kind: "source" | "target",
): string | null {
  const handle = kind === "source" ? edge.sourceHandle : edge.targetHandle;
  const fromHandle = columnFromHandle(handle);
  if (fromHandle) {
    return fromHandle;
  }
  const data = edge.data as
    | { sourceColumns?: string[]; targetColumns?: string[] }
    | undefined;
  const cols =
    kind === "source" ? data?.sourceColumns : data?.targetColumns;
  return cols?.[0] ?? null;
}

export function getRelationshipEdgePoints(
  edge: Edge,
  sourceNode: Node,
  targetNode: Node,
): RelationshipEdgePoints {
  const sW = tableNodeDimensions(sourceNode).width;
  const tW = tableNodeDimensions(targetNode).width;
  const sx = sourceNode.position.x;
  const sy = sourceNode.position.y;
  const tx = targetNode.position.x;
  const ty = targetNode.position.y;

  const sourceCol = columnFromEdge(edge, "source");
  const targetCol = columnFromEdge(edge, "target");
  const sourceY = sy + columnHandleOffsetY(sourceNode, edge.sourceHandle, sourceCol);
  const targetY = ty + columnHandleOffsetY(targetNode, edge.targetHandle, targetCol);

  let sourceX: number;
  let targetX: number;
  let sourceSide: "left" | "right";
  let targetSide: "left" | "right";

  if (sx + sW <= tx) {
    sourceX = sx + sW;
    targetX = tx;
    sourceSide = "right";
    targetSide = "left";
  } else if (tx + tW <= sx) {
    sourceX = sx;
    targetX = tx + tW;
    sourceSide = "left";
    targetSide = "right";
  } else {
    sourceX = sx + sW;
    targetX = tx + tW;
    sourceSide = "right";
    targetSide = "right";
  }

  return { sourceX, sourceY, targetX, targetY, sourceSide, targetSide };
}
