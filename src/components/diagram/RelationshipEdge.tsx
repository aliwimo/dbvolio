import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { memo, useMemo } from "react";

export interface RelationshipEdgeData extends Record<string, unknown> {
  sourceColumns: string[];
  targetColumns: string[];
  showLabels?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  animate?: boolean;
}

function relationshipEdgePropsEqual(
  prev: EdgeProps,
  next: EdgeProps,
): boolean {
  if (prev.id !== next.id) {
    return false;
  }
  if (
    prev.sourceX !== next.sourceX ||
    prev.sourceY !== next.sourceY ||
    prev.targetX !== next.targetX ||
    prev.targetY !== next.targetY
  ) {
    return false;
  }
  const prevData = (prev.data ?? {}) as RelationshipEdgeData;
  const nextData = (next.data ?? {}) as RelationshipEdgeData;
  return (
    prevData.showLabels === nextData.showLabels &&
    prevData.dimmed === nextData.dimmed &&
    prevData.highlighted === nextData.highlighted &&
    prevData.animate === nextData.animate
  );
}

function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const edgeData = (data ?? {}) as unknown as RelationshipEdgeData;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
  });
  const label = useMemo(
    () =>
      `${edgeData.sourceColumns?.join(", ") ?? ""} → ${edgeData.targetColumns?.join(", ") ?? ""}`,
    [edgeData.sourceColumns, edgeData.targetColumns],
  );
  const showLabels = edgeData.showLabels ?? false;
  const dimmed = edgeData.dimmed ?? false;
  const highlighted = edgeData.highlighted ?? false;
  const animate = edgeData.animate ?? false;
  const showFlow = highlighted && !dimmed && animate;

  const trackClass = [
    "relationship-edge-track",
    highlighted ? "relationship-edge-track-active" : "",
    dimmed ? "relationship-edge-track-dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        style={{
          ...style,
          stroke: "none",
          fill: "none",
        }}
      />
      <path
        d={path}
        className={trackClass}
        markerEnd={
          highlighted && !dimmed ? "url(#relationship-arrowhead)" : undefined
        }
      />
      {showFlow && (
        <path
          d={path}
          className="relationship-edge-flow-line"
          markerEnd="url(#relationship-arrowhead-soft)"
        />
      )}
      {showLabels && (
        <EdgeLabelRenderer>
          <div
            className="relationship-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              opacity: dimmed ? 0.35 : 1,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const RelationshipEdge = memo(
  RelationshipEdgeComponent,
  relationshipEdgePropsEqual,
);

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
          className="relationship-edge-marker"
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
          className="relationship-edge-marker-soft"
        />
      </marker>
    </defs>
  );
}
