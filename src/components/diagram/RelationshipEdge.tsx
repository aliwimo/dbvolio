import { Show } from "solid-js";

export interface RelationshipEdgeData extends Record<string, unknown> {
  sourceColumns: string[];
  targetColumns: string[];
  showLabels?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  animate?: boolean;
}

export function computeSmoothStepPath(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): [string, number, number] {
  const { sourceX, sourceY, targetX, targetY } = params;
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const midX = sourceX + dx / 2;
  const midY = sourceY + dy / 2;

  const path = `M ${sourceX} ${sourceY} C ${sourceX + 40} ${sourceY}, ${targetX - 40} ${targetY}, ${targetX} ${targetY}`;
  return [path, midX, midY];
}

export function RelationshipEdge(props: {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  data?: RelationshipEdgeData;
}) {
  const data = () => props.data ?? { sourceColumns: [], targetColumns: [] };
  const pathInfo = () =>
    computeSmoothStepPath({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      targetX: props.targetX,
      targetY: props.targetY,
    });

  const path = () => pathInfo()[0];
  const labelX = () => pathInfo()[1];
  const labelY = () => pathInfo()[2];

  const label = () =>
    `${data().sourceColumns?.join(", ") ?? ""} → ${data().targetColumns?.join(", ") ?? ""}`;
  const showLabels = () => data().showLabels ?? false;
  const dimmed = () => data().dimmed ?? false;
  const highlighted = () => data().highlighted ?? false;
  const animate = () => data().animate ?? false;
  const showFlow = () => highlighted() && !dimmed() && animate();

  const trackClass = () =>
    [
      "relationship-edge-track",
      highlighted() ? "relationship-edge-track-active" : "",
      dimmed() ? "relationship-edge-track-dimmed" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <g class="relationship-edge-group">
      <path
        d={path()}
        class={trackClass()}
        marker-end={
          highlighted() && !dimmed() ? "url(#relationship-arrowhead)" : undefined
        }
      />
      <Show when={showFlow()}>
        <path
          d={path()}
          class="relationship-edge-flow-line"
          marker-end="url(#relationship-arrowhead-soft)"
        />
      </Show>
      <Show when={showLabels()}>
        <foreignObject
          x={labelX() - 80}
          y={labelY() - 14}
          width={160}
          height={28}
          class="relationship-edge-label-container"
        >
          <div
            class="relationship-edge-label"
            style={{ opacity: dimmed() ? 0.35 : 1 }}
          >
            {label()}
          </div>
        </foreignObject>
      </Show>
    </g>
  );
}

export function RelationshipEdgeMarkers() {
  return (
    <defs>
      <marker
        id="relationship-arrowhead"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          class="relationship-edge-marker"
        />
      </marker>
      <marker
        id="relationship-arrowhead-soft"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          class="relationship-edge-marker-soft"
        />
      </marker>
    </defs>
  );
}
