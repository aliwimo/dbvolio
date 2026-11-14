import { Show } from "solid-js";
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

export function TableGroupNode(props: {
  data: TableGroupNodeData;
  selected?: boolean;
  id: string;
}) {
  const group = () => props.data.group;
  const width = () => props.data.width ?? 320;
  const height = () => props.data.height ?? 200;
  const color = () => resolveGroupColor(group());
  const title = () =>
    group().schema ? `${group().schema}.${group().name}` : group().name;

  return (
    <div
      class={`table-group-node ${props.selected ? "selected" : ""}`}
      style={{
        width: `${width()}px`,
        height: `${height()}px`,
        opacity: props.data.dimmed ? 0.25 : 1,
        "--group-color": color(),
      }}
    >
      <div class="table-group-header">
        <div class="table-group-header-main">
          <span
            class="table-group-swatch"
            style={{ background: color() }}
            aria-hidden
          />
          <span class="table-group-title" title={title()}>
            {title()}
          </span>
          <span class="table-group-count">
            {group().tableIds.length}{" "}
            {group().tableIds.length === 1 ? "table" : "tables"}
          </span>
        </div>
        <Show when={group().note}>
          <div class="table-group-note" title={group().note}>
            {group().note}
          </div>
        </Show>
      </div>
    </div>
  );
}
