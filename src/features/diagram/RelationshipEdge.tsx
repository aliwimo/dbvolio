import type { RelationshipEdgePoints } from "./relationship-edge-geometry";

export function computeOrthogonalPath(params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceSide?: "left" | "right";
  targetSide?: "left" | "right";
  channel?: number;
}): [string, number, number, string] {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceSide = "right",
    targetSide = "left",
    channel = 0,
  } = params;

  const stub = 28;
  const midY = sourceY + (targetY - sourceY) / 2;
  let points: Array<[number, number]>;
  let labelX: number;

  if (sourceSide === "right" && targetSide === "left" && sourceX <= targetX) {
    const room = Math.max(0, (targetX - sourceX) / 2 - 16);
    const midX = sourceX + (targetX - sourceX) / 2 + clamp(channel, -room, room);
    points = [
      [sourceX, sourceY],
      [midX, sourceY],
      [midX, targetY],
      [targetX, targetY],
    ];
    labelX = midX;
  } else if (sourceSide === "left" && targetSide === "right" && sourceX >= targetX) {
    const room = Math.max(0, (sourceX - targetX) / 2 - 16);
    const midX = sourceX + (targetX - sourceX) / 2 + clamp(channel, -room, room);
    points = [
      [sourceX, sourceY],
      [midX, sourceY],
      [midX, targetY],
      [targetX, targetY],
    ];
    labelX = midX;
  } else if (sourceSide === "right" && targetSide === "right") {
    const outerX = Math.max(sourceX, targetX) + stub + Math.max(0, channel);
    points = [
      [sourceX, sourceY],
      [outerX, sourceY],
      [outerX, targetY],
      [targetX, targetY],
    ];
    labelX = outerX;
  } else if (sourceSide === "left" && targetSide === "left") {
    const outerX = Math.min(sourceX, targetX) - stub - Math.max(0, channel);
    points = [
      [sourceX, sourceY],
      [outerX, sourceY],
      [outerX, targetY],
      [targetX, targetY],
    ];
    labelX = outerX;
  } else if (sourceSide === "right") {
    points = [
      [sourceX, sourceY],
      [sourceX + stub, sourceY],
      [sourceX + stub, midY],
      [targetX - stub, midY],
      [targetX - stub, targetY],
      [targetX, targetY],
    ];
    labelX = (sourceX + targetX) / 2;
  } else {
    points = [
      [sourceX, sourceY],
      [sourceX - stub, sourceY],
      [sourceX - stub, midY],
      [targetX + stub, midY],
      [targetX + stub, targetY],
      [targetX, targetY],
    ];
    labelX = (sourceX + targetX) / 2;
  }

  const path = roundedOrthogonal(points, 8);
  const radius = 2.5;
  const arrow = `M ${targetX - radius} ${targetY} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
  const labelY = sourceY + (targetY - sourceY) / 2;

  return [path, labelX, labelY, arrow];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Straight segments with a short radius only at the corners. */
function roundedOrthogonal(points: Array<[number, number]>, radius: number): string {
  const clean: Array<[number, number]> = [];
  for (const point of points) {
    const prev = clean[clean.length - 1];
    if (!prev || Math.abs(point[0] - prev[0]) > 0.5 || Math.abs(point[1] - prev[1]) > 0.5) {
      clean.push(point);
    }
  }
  if (clean.length === 0) return "";
  if (clean.length === 1) return `M ${clean[0][0]} ${clean[0][1]}`;

  let d = `M ${clean[0][0]} ${clean[0][1]}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const [x0, y0] = clean[i - 1];
    const [x1, y1] = clean[i];
    const [x2, y2] = clean[i + 1];
    const dx1 = x1 - x0;
    const dy1 = y1 - y0;
    const dx2 = x2 - x1;
    const dy2 = y2 - y1;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);
    const rad = Math.min(radius, len1 / 2, len2 / 2);
    if (rad < 1 || len1 === 0 || len2 === 0) {
      d += ` L ${x1} ${y1}`;
      continue;
    }
    const ax = x1 - (dx1 / len1) * rad;
    const ay = y1 - (dy1 / len1) * rad;
    const bx = x1 + (dx2 / len2) * rad;
    const by = y1 + (dy2 / len2) * rad;
    d += ` L ${ax} ${ay} Q ${x1} ${y1} ${bx} ${by}`;
  }
  const last = clean[clean.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

/** Backward compatibility alias for computeOrthogonalPath. */
export const computeSmoothStepPath = computeOrthogonalPath;

export type { RelationshipEdgePoints };
