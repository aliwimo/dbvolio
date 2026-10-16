import { CompilerError, Parser } from "@dbml/core";
import type { Diagnostic } from "../types/diagnostics";
import type {
  SchemaColumn,
  SchemaEnum,
  SchemaIndex,
  SchemaModel,
  SchemaReference,
  SchemaTable,
} from "../types/schema";

export interface ParseResult {
  model: SchemaModel | null;
  diagnostics: Diagnostic[];
}

const parser = new Parser();

function toAbsolutePath(projectRoot: string, relativePath: string): string {
  const root = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");
  const rel = relativePath.replace(/\\/g, "/").replace(/^\//, "");
  return `${root}/${rel}`;
}

function relativeFromAbsolute(
  projectRoot: string,
  absolutePath: string,
): string {
  const root = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");
  const abs = absolutePath.replace(/\\/g, "/");
  if (abs.startsWith(`${root}/`)) {
    return abs.slice(root.length + 1);
  }
  return abs;
}

function formatFieldType(fieldType: unknown): string {
  if (typeof fieldType === "string") {
    return fieldType;
  }
  if (fieldType && typeof fieldType === "object") {
    const named = fieldType as { type_name?: string; args?: string | null };
    if (named.type_name) {
      if (named.args && !named.type_name.endsWith(`(${named.args})`)) {
        return `${named.type_name}(${named.args})`;
      }
      return named.type_name;
    }
  }
  return "unknown";
}

function formatDbDefault(dbdefault: unknown): string | undefined {
  if (dbdefault === null || dbdefault === undefined) {
    return undefined;
  }
  if (typeof dbdefault === "object") {
    const def = dbdefault as { type?: string; value?: unknown };
    if (def.value === undefined || def.value === null) {
      return undefined;
    }
    if (def.type === "string") {
      return `'${String(def.value)}'`;
    }
    if (def.type === "expression") {
      return `\`${String(def.value)}\``;
    }
    return String(def.value);
  }
  return String(dbdefault);
}

function tableId(schemaName: string | null | undefined, name: string): string {
  const schema = schemaName || "public";
  return `${schema}.${name}`;
}

function mapIndexColumns(index: {
  columns?: { value?: unknown }[];
}): string[] {
  return (index.columns ?? []).map((col) => {
    if (typeof col === "object" && col !== null && "value" in col) {
      return String((col as { value: unknown }).value);
    }
    return String(col);
  });
}

function normalizeTable(table: {
  schema?: { name?: string };
  name: string;
  fields?: {
    name: string;
    type: unknown;
    pk?: boolean;
    not_null?: boolean;
    unique?: boolean;
    increment?: boolean;
    dbdefault?: unknown;
    note?: string;
  }[];
  indexes?: {
    name?: string;
    columns?: { value?: unknown }[];
    type?: string;
    unique?: boolean;
    pk?: boolean;
    note?: string;
  }[];
  note?: string;
  headerColor?: string;
}): SchemaTable {
  const schemaName = table.schema?.name || "public";
  const columns: SchemaColumn[] = (table.fields ?? []).map((field) => ({
    name: field.name,
    type: formatFieldType(field.type),
    isPrimaryKey: Boolean(field.pk),
    isNullable: !field.not_null,
    isUnique: Boolean(field.unique),
    isAutoIncrement: field.increment ? true : undefined,
    defaultValue: formatDbDefault(field.dbdefault),
    note: field.note || undefined,
  }));

  const indexes: SchemaIndex[] = (table.indexes ?? []).map((index) => ({
    name: index.name || undefined,
    columns: mapIndexColumns(index),
    type: index.type || undefined,
    unique: index.unique || undefined,
    pk: index.pk ? true : undefined,
    note: index.note || undefined,
  }));

  return {
    id: tableId(schemaName, table.name),
    schema: schemaName === "public" ? undefined : schemaName,
    name: table.name,
    columns,
    indexes,
    note: table.note || undefined,
    headerColor: table.headerColor || undefined,
  };
}

function normalizeEnums(database: {
  schemas?: {
    name?: string;
    enums?: { name: string; values?: { name: string }[] }[];
  }[];
}): SchemaEnum[] {
  const enums: SchemaEnum[] = [];
  for (const schema of database.schemas ?? []) {
    for (const enumItem of schema.enums ?? []) {
      enums.push({
        id: tableId(schema.name, enumItem.name),
        schema: schema.name || undefined,
        name: enumItem.name,
        values: (enumItem.values ?? []).map((v) => v.name),
      });
    }
  }
  return enums;
}

type RefEndpoint = {
  schemaName?: string | null;
  tableName: string;
  fieldNames?: string[];
};

function columnIsPrimaryKey(
  tableIdKey: string,
  columnName: string,
  tablesById: Map<string, SchemaTable>,
): boolean {
  const table = tablesById.get(tableIdKey);
  return (
    table?.columns.some((c) => c.name === columnName && c.isPrimaryKey) ??
    false
  );
}

function endpointColumnsArePrimaryKey(
  endpoint: RefEndpoint,
  tablesById: Map<string, SchemaTable>,
): boolean {
  const fields = endpoint.fieldNames ?? [];
  if (fields.length === 0) {
    return false;
  }
  const id = tableId(endpoint.schemaName || undefined, endpoint.tableName);
  return fields.every((field) => columnIsPrimaryKey(id, field, tablesById));
}

/** FK column(s) on child table → referenced PK column(s) on parent table. */
function orientReferenceEndpoints(
  first: RefEndpoint,
  second: RefEndpoint,
  tablesById: Map<string, SchemaTable>,
): {
  sourceTableId: string;
  sourceColumns: string[];
  targetTableId: string;
  targetColumns: string[];
} | null {
  const firstTableId = tableId(first.schemaName || undefined, first.tableName);
  const secondTableId = tableId(
    second.schemaName || undefined,
    second.tableName,
  );
  if (!tablesById.has(firstTableId) || !tablesById.has(secondTableId)) {
    return null;
  }

  const firstIsPk = endpointColumnsArePrimaryKey(first, tablesById);
  const secondIsPk = endpointColumnsArePrimaryKey(second, tablesById);

  // Inline `[ref: > parent.col]` often lists the PK endpoint first — swap to FK → PK.
  if (firstIsPk && !secondIsPk) {
    return {
      sourceTableId: secondTableId,
      sourceColumns: [...(second.fieldNames ?? [])],
      targetTableId: firstTableId,
      targetColumns: [...(first.fieldNames ?? [])],
    };
  }

  return {
    sourceTableId: firstTableId,
    sourceColumns: [...(first.fieldNames ?? [])],
    targetTableId: secondTableId,
    targetColumns: [...(second.fieldNames ?? [])],
  };
}

function normalizeReferences(
  database: {
    schemas?: {
      refs?: {
        name?: string;
        endpoints?: RefEndpoint[];
      }[];
    }[];
  },
  tablesById: Map<string, SchemaTable>,
): SchemaReference[] {
  const refs = database.schemas?.flatMap((schema) => schema.refs ?? []) ?? [];
  const references: SchemaReference[] = [];

  refs.forEach((ref, index) => {
    const endpoints = ref.endpoints ?? [];
    if (endpoints.length < 2) {
      return;
    }
    const oriented = orientReferenceEndpoints(
      endpoints[0],
      endpoints[1],
      tablesById,
    );
    if (!oriented) {
      return;
    }
    references.push({
      id: ref.name || `ref-${index}`,
      ...oriented,
    });
  });

  return references;
}

export function normalizeDatabase(database: {
  schemas?: {
    name?: string;
    tables?: Parameters<typeof normalizeTable>[0][];
    enums?: { name: string; values?: { name: string }[] }[];
    refs?: {
      name?: string;
      endpoints?: {
        schemaName?: string | null;
        tableName: string;
        fieldNames?: string[];
      }[];
    }[];
  }[];
}): SchemaModel {
  const tables: SchemaTable[] = [];
  for (const schema of database.schemas ?? []) {
    for (const table of schema.tables ?? []) {
      tables.push(normalizeTable(table));
    }
  }
  const tablesById = new Map(tables.map((t) => [t.id, t]));
  return {
    tables,
    references: normalizeReferences(database, tablesById),
    enums: normalizeEnums(database),
  };
}

function mapCompilerDiagnostic(diag: {
  message: string;
  filepath?: string;
  location: { start: { line: number; column: number }; end?: { line: number; column: number } };
  type?: string;
  code?: number;
}): Diagnostic {
  return {
    message: diag.message,
    filepath: diag.filepath,
    line: diag.location.start.line,
    column: diag.location.start.column,
    endLine: diag.location.end?.line,
    endColumn: diag.location.end?.column,
    severity:
      diag.type === "warning"
        ? "warning"
        : diag.type === "info"
          ? "info"
          : "error",
    code: diag.code,
  };
}

export function parseProject(
  projectRoot: string,
  files: Record<string, string>,
  entryPoint: string,
): ParseResult {
  parser.clearDbmlSource();
  for (const [relativePath, content] of Object.entries(files)) {
    parser.setDbmlSource(
      toAbsolutePath(projectRoot, relativePath),
      content,
    );
  }

  const entryAbsolute = toAbsolutePath(projectRoot, entryPoint);

  try {
    const database = parser.parseDbmlProject(entryAbsolute);
    return {
      model: normalizeDatabase(database),
      diagnostics: [],
    };
  } catch (error) {
    if (error instanceof CompilerError) {
      const diagnostics = error.diags.map(mapCompilerDiagnostic).map((d) => ({
        ...d,
        filepath: d.filepath
          ? relativeFromAbsolute(projectRoot, d.filepath)
          : undefined,
      }));
      return { model: null, diagnostics };
    }
    return {
      model: null,
      diagnostics: [
        {
          message: error instanceof Error ? error.message : String(error),
          line: 1,
          column: 1,
          severity: "error",
        },
      ],
    };
  }
}
