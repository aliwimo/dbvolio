import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import {
  sourceHandleId,
  targetHandleId,
} from "../../features/schema/column-handles";
import type { SchemaTable } from "../../types/schema";

export interface TableNodeData extends Record<string, unknown> {
  table: SchemaTable;
  foreignKeys: Set<string>;
  refSourceColumns?: Set<string>;
  refTargetColumns?: Set<string>;
  dimmed?: boolean;
  headerColor?: string;
}

function TableNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TableNodeData;
  const {
    table,
    foreignKeys,
    refSourceColumns = new Set<string>(),
    refTargetColumns = new Set<string>(),
    dimmed,
  } = nodeData;
  const headerColor = nodeData.headerColor ?? table.headerColor;

  return (
    <div
      className={`table-node ${selected ? "selected" : ""}`}
      style={{ opacity: dimmed ? 0.35 : 1 }}
    >
      <div
        className="table-node-header"
        style={
          headerColor
            ? {
                background: headerColor,
                borderColor: headerColor,
              }
            : undefined
        }
      >
        {table.schema ? `${table.schema}.` : ""}
        {table.name}
      </div>
      <div className="table-node-columns">
        {table.columns.map((col) => {
          const isFk =
            refSourceColumns.has(col.name) || foreignKeys.has(col.name);
          const showSource = refSourceColumns.has(col.name);
          const showTarget = refTargetColumns.has(col.name);

          return (
            <div key={col.name} className="table-node-row">
              {showTarget && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={targetHandleId(col.name)}
                  className="table-node-handle table-node-handle-target"
                  isConnectable={false}
                />
              )}
              <span className="table-node-row-label">
                {col.name}
                {col.isPrimaryKey && <span className="badge pk">PK</span>}
                {isFk && <span className="badge fk">FK</span>}
              </span>
              <span className="table-node-type">{col.type}</span>
              {showSource && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={sourceHandleId(col.name)}
                  className="table-node-handle table-node-handle-source"
                  isConnectable={false}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tableNodePropsEqual(prev: NodeProps, next: NodeProps): boolean {
  if (prev.selected !== next.selected) {
    return false;
  }
  const prevData = prev.data as TableNodeData;
  const nextData = next.data as TableNodeData;
  return (
    prevData.table === nextData.table &&
    prevData.foreignKeys === nextData.foreignKeys &&
    prevData.refSourceColumns === nextData.refSourceColumns &&
    prevData.refTargetColumns === nextData.refTargetColumns &&
    (prevData.dimmed ?? false) === (nextData.dimmed ?? false) &&
    prevData.headerColor === nextData.headerColor
  );
}

export const TableNode = memo(TableNodeComponent, tableNodePropsEqual);
