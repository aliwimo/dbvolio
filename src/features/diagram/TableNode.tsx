import { For, Show } from "solid-js";
import {
  sourceHandleId,
  targetHandleId,
} from "../schema/column-handles";
import type { SchemaTable } from "../schema/schema";

export interface TableNodeData extends Record<string, unknown> {
  table: SchemaTable;
  foreignKeys: Set<string>;
  refSourceColumns?: Set<string>;
  refTargetColumns?: Set<string>;
  dimmed?: boolean;
  headerColor?: string;
}

export function TableNode(props: {
  data: TableNodeData;
  selected?: boolean;
  id: string;
}) {
  const table = () => props.data.table;
  const foreignKeys = () => props.data.foreignKeys || new Set<string>();
  const refSourceColumns = () => props.data.refSourceColumns || new Set<string>();
  const refTargetColumns = () => props.data.refTargetColumns || new Set<string>();
  const headerColor = () => props.data.headerColor ?? table().headerColor;

  return (
    <div
      class={`table-node ${props.selected ? "selected" : ""}`}
      style={{ opacity: props.data.dimmed ? 0.35 : 1 }}
    >
      <div
        class="table-node-header"
        style={
          headerColor()
            ? {
                background: headerColor(),
                "border-color": headerColor(),
              }
            : undefined
        }
      >
        {table().schema ? `${table().schema}.` : ""}
        {table().name}
      </div>
      <div class="table-node-columns">
        <For each={table().columns}>
          {(col) => {
            const isFk = () =>
              refSourceColumns().has(col.name) || foreignKeys().has(col.name);
            const showSource = () => refSourceColumns().has(col.name);
            const showTarget = () => refTargetColumns().has(col.name);

            return (
              <div class="table-node-row">
                <Show when={showTarget()}>
                  <div
                    id={targetHandleId(col.name)}
                    class="table-node-handle table-node-handle-target"
                  />
                </Show>
                <span class="table-node-row-label">
                  {col.name}
                  <Show when={col.isPrimaryKey}>
                    <span class="badge pk">PK</span>
                  </Show>
                  <Show when={isFk()}>
                    <span class="badge fk">FK</span>
                  </Show>
                </span>
                <span class="table-node-type">{col.type}</span>
                <Show when={showSource()}>
                  <div
                    id={sourceHandleId(col.name)}
                    class="table-node-handle table-node-handle-source"
                  />
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
