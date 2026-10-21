import type { NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { SchemaTableGroup } from "../../types/schema";

export interface TableGroupNodeData extends Record<string, unknown> {
  group: SchemaTableGroup;
  width?: number;
  height?: number;
  dimmed?: boolean;
}

const DEFAULT_GROUP_PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

export function resolveGroupColor(group: SchemaTableGroup): string {
  if (group.color?.trim()) {
    return group.color.trim();
  }
  let hash = 0;
  for (let i = 0; i < group.id.length; i += 1) {
    hash = (hash * 31 + group.id.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % DEFAULT_GROUP_PALETTE.length;
  return DEFAULT_GROUP_PALETTE[index];
}

function TableGroupNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TableGroupNodeData;
  const { group, width = 320, height = 200, dimmed } = nodeData;
  const color = resolveGroupColor(group);
  const title = group.schema ? `${group.schema}.${group.name}` : group.name;

  return (
    <div
      className={`table-group-node ${selected ? "selected" : ""}`}
      style={
        {
          width,
          height,
          opacity: dimmed ? 0.25 : 1,
          "--group-color": color,
        } as React.CSSProperties
      }
    >
      <div className="table-group-header">
        <div className="table-group-header-main">
          <span
            className="table-group-swatch"
            style={{ background: color }}
            aria-hidden
          />
          <span className="table-group-title" title={title}>
            {title}
          </span>
          <span className="table-group-count">
            {group.tableIds.length}{" "}
            {group.tableIds.length === 1 ? "table" : "tables"}
          </span>
        </div>
        {group.note && (
          <div className="table-group-note" title={group.note}>
            {group.note}
          </div>
        )}
      </div>
    </div>
  );
}

function tableGroupNodePropsEqual(prev: NodeProps, next: NodeProps): boolean {
  if (prev.selected !== next.selected) {
    return false;
  }
  const prevData = prev.data as TableGroupNodeData;
  const nextData = next.data as TableGroupNodeData;
  return (
    prevData.group === nextData.group &&
    prevData.width === nextData.width &&
    prevData.height === nextData.height &&
    (prevData.dimmed ?? false) === (nextData.dimmed ?? false)
  );
}

export const TableGroupNode = memo(
  TableGroupNodeComponent,
  tableGroupNodePropsEqual,
);
