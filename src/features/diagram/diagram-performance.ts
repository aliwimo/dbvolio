/** Thresholds for turning down interactive diagram features. */
export const LARGE_DIAGRAM_TABLE_COUNT = 36;
export const LARGE_DIAGRAM_EDGE_COUNT = 72;

export function isLargeDiagram(
  tableCount: number,
  edgeCount: number,
): boolean {
  return (
    tableCount >= LARGE_DIAGRAM_TABLE_COUNT ||
    edgeCount >= LARGE_DIAGRAM_EDGE_COUNT
  );
}
