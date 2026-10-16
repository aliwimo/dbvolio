import type { SchemaColumn } from "../../../types/schema";

export function findDuplicateColumnName(
  columns: SchemaColumn[],
  name: string,
  exceptName?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Column name is required.";
  }
  const lower = trimmed.toLowerCase();
  const clash = columns.find(
    (c) =>
      c.name.toLowerCase() === lower &&
      c.name.toLowerCase() !== exceptName?.toLowerCase(),
  );
  if (clash) {
    return `Column "${trimmed}" already exists.`;
  }
  return null;
}

export function moveColumnInList(
  columns: SchemaColumn[],
  columnName: string,
  direction: "up" | "down",
): SchemaColumn[] {
  const index = columns.findIndex((c) => c.name === columnName);
  if (index < 0) {
    return columns;
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= columns.length) {
    return columns;
  }
  const next = [...columns];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function updateColumnInList(
  columns: SchemaColumn[],
  originalName: string,
  next: SchemaColumn,
): SchemaColumn[] | null {
  const dup = findDuplicateColumnName(columns, next.name, originalName);
  if (dup) {
    return null;
  }
  return columns.map((c) => (c.name === originalName ? next : c));
}

export function formatQualifiedTableName(
  schema: string,
  name: string,
): string {
  const s = schema.trim() || "public";
  const n = name.trim() || "table_name";
  return `${s}.${n}`;
}
