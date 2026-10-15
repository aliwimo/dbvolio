/** Single connection point per table (used for diagram performance). */
export const TABLE_SOURCE_HANDLE = "source";
export const TABLE_TARGET_HANDLE = "target";

export function sourceHandleId(columnName: string): string {
  return `source:${columnName}`;
}

export function targetHandleId(columnName: string): string {
  return `target:${columnName}`;
}
