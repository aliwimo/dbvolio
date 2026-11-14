import { For, Show, createMemo } from "solid-js";
import type { Edge, Node } from "../../types/flow";
import { getRelationshipEdgePoints } from "../../features/diagram/relationship-edge-geometry";
import { computeOrthogonalPath } from "./RelationshipEdge";

export type DiagramEdgeItem = {
  id: string;
  source: string;
  target: string;
  d: string;
  labelX: number;
  labelY: number;
  label: string;
  arrow: string;
  channel: number;
};

function edgeChannels(edges: Edge[], byId: Map<string, Node>): Map<string, number> {
  const groups = new Map<string, string[]>();
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    const points = getRelationshipEdgePoints(edge, source, target);
    const key = `${points.sourceSide}:${points.targetSide}:${edge.source}:${edge.target}`;
    const list = groups.get(key) ?? [];
    list.push(edge.id);
    groups.set(key, list);
  }
  const channels = new Map<string, number>();
  for (const [key, ids] of groups) {
    const sameSide = key.startsWith("right:right") || key.startsWith("left:left");
    ids.forEach((id, index) => {
      const offset = sameSide ? index * 12 : (index - (ids.length - 1) / 2) * 12;
      channels.set(id, offset);
    });
  }
  return channels;
}

function edgeLabel(edge: Edge): string {
  const data = edge.data as
    | { sourceColumns?: string[]; targetColumns?: string[] }
    | undefined;
  return `${data?.sourceColumns?.join(", ") ?? ""} → ${data?.targetColumns?.join(", ") ?? ""}`;
}

/** One pass over nodes and edges. Hover and selection do not rebuild paths. */
export function diagramEdgeGeometry(
  nodes: Node[],
  edges: Edge[],
): { items: DiagramEdgeItem[]; minX: number; minY: number; width: number; height: number } {
  let minX = 0;
  let minY = 0;
  let maxX = 1;
  let maxY = 1;
  const byId = new Map<string, Node>();
  for (const node of nodes) {
    byId.set(node.id, node);
    const x = node.position.x;
    const y = node.position.y;
    const w = node.width ?? 260;
    const h = node.height ?? 200;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  const pad = 80;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const channels = edgeChannels(edges, byId);
  const items: DiagramEdgeItem[] = [];
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    const channel = channels.get(edge.id) ?? 0;
    const [d, labelX, labelY, arrow] = computeOrthogonalPath({
      ...getRelationshipEdgePoints(edge, source, target),
      channel,
    });
    if (!d) continue;
    items.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      d,
      labelX,
      labelY,
      label: edgeLabel(edge),
      arrow,
      channel,
    });
  }

  return {
    items,
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function DiagramEdges(props: {
  nodes: () => Node[];
  edges: () => Edge[];
  showLabels: () => boolean;
  emphasizeRelated: () => boolean;
  selectedId: () => string | null;
  hoveredId: () => string | null;
}) {
  const geometry = createMemo(() => diagramEdgeGeometry(props.nodes(), props.edges()));
  const byId = createMemo(() => {
    const map = new Map<string, DiagramEdgeItem>();
    for (const item of geometry().items) map.set(item.id, item);
    return map;
  });

  const related = createMemo(() => {
    const selected = props.selectedId();
    if (!props.emphasizeRelated() || !selected) return null;
    const ids = new Set<string>([selected]);
    for (const edge of props.edges()) {
      if (edge.source === selected || edge.target === selected) {
        ids.add(edge.source);
        ids.add(edge.target);
      }
    }
    return ids;
  });

  const highlighted = (source: string, target: string) => {
    const hover = props.hoveredId();
    const selected = props.selectedId();
    return source === hover || target === hover || source === selected || target === selected;
  };

  const dimmed = (source: string, target: string) => {
    const rel = related();
    if (!rel) return false;
    return !rel.has(source) || !rel.has(target);
  };

  return (
    <svg
      class="diagram-edges-svg"
      style={{
        position: "absolute",
        left: `${geometry().minX}px`,
        top: `${geometry().minY}px`,
        width: `${geometry().width}px`,
        height: `${geometry().height}px`,
        overflow: "visible",
        "pointer-events": "none",
      }}
      viewBox={`${geometry().minX} ${geometry().minY} ${geometry().width} ${geometry().height}`}
    >
      <For each={props.edges()}>
        {(edge) => {
          const item = () => byId().get(edge.id);
          const hot = () => highlighted(edge.source, edge.target);
          const fade = () => dimmed(edge.source, edge.target);
          const trackClass = () =>
            `relationship-edge-track${hot() ? " relationship-edge-track-active" : ""}${fade() ? " relationship-edge-track-dimmed" : ""}`;
          return (
            <Show when={item()}>
              {(row) => (
                <g
                  class="relationship-edge-group"
                  data-edge-id={edge.id}
                  data-source={edge.source}
                  data-target={edge.target}
                  data-channel={row().channel}
                >
                  <path d={row().d} class={trackClass()} />
                  <path
                    d={row().arrow}
                    class={`${trackClass()} relationship-edge-arrow`}
                  />
                  <Show when={props.showLabels()}>
                    <foreignObject
                      x={row().labelX - 80}
                      y={row().labelY - 14}
                      width={160}
                      height={28}
                      class="relationship-edge-label-container"
                    >
                      <div
                        class="relationship-edge-label"
                        style={{ opacity: fade() ? 0.35 : 1 }}
                      >
                        {row().label}
                      </div>
                    </foreignObject>
                  </Show>
                </g>
              )}
            </Show>
          );
        }}
      </For>
    </svg>
  );
}
