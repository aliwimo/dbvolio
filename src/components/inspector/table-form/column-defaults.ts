import type { SchemaColumn } from "../../../types/schema";

export function defaultIdColumn(): SchemaColumn {
  return {
    name: "id",
    type: "serial",
    isPrimaryKey: true,
    isNullable: false,
    isUnique: false,
  };
}

export function emptyColumn(): SchemaColumn {
  return {
    name: "",
    type: "varchar",
    isPrimaryKey: false,
    isNullable: true,
    isUnique: false,
  };
}

export function columnsEqual(a: SchemaColumn, b: SchemaColumn): boolean {
  return (
    a.name === b.name &&
    a.type === b.type &&
    a.isPrimaryKey === b.isPrimaryKey &&
    a.isNullable === b.isNullable &&
    a.isUnique === b.isUnique
  );
}
