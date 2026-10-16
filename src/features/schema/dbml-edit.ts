import type { SchemaColumn, SchemaTable } from "../../types/schema";

export interface TableBlockLocation {
  startLine: number;
  endLine: number;
  headerLine: number;
}

export interface ParsedTableHeader {
  schema?: string;
  name: string;
  rawRef: string;
}

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").split("\n");
}

function joinLines(lines: string[]): string {
  return lines.join("\n");
}

const TABLE_HEADER_LINE =
  /^Table\s+("([^"]+)"|([^\s\[]+))(?:\s*\[[^\]]*\])?\s*\{?\s*$/i;

export function parseTableHeaderLine(line: string): ParsedTableHeader | null {
  const trimmed = line.trim();
  const match = trimmed.match(TABLE_HEADER_LINE);
  if (!match) {
    return null;
  }
  const rawRef = match[2] ?? match[3];
  const unquoted = rawRef.replace(/^"|"$/g, "");
  if (unquoted.includes(".")) {
    const dot = unquoted.indexOf(".");
    return {
      schema: unquoted.slice(0, dot),
      name: unquoted.slice(dot + 1),
      rawRef: unquoted,
    };
  }
  return { name: unquoted, rawRef: unquoted };
}

export function tableMatchesId(
  header: ParsedTableHeader,
  table: Pick<SchemaTable, "id" | "name" | "schema">,
): boolean {
  const schema = table.schema ?? "public";
  const headerSchema = header.schema ?? "public";
  return header.name === table.name && headerSchema === schema;
}

export function findTableBlock(
  content: string,
  table: Pick<SchemaTable, "id" | "name" | "schema">,
): TableBlockLocation | null {
  const lines = splitLines(content);
  for (let i = 0; i < lines.length; i += 1) {
    const header = parseTableHeaderLine(lines[i]);
    if (!header || !tableMatchesId(header, table)) {
      continue;
    }
    let depth = 0;
    let started = false;
    for (let j = i; j < lines.length; j += 1) {
      for (const char of lines[j]) {
        if (char === "{") {
          depth += 1;
          started = true;
        } else if (char === "}") {
          depth -= 1;
        }
      }
      if (started && depth <= 0) {
        return { startLine: i, endLine: j, headerLine: i };
      }
    }
    return null;
  }
  return null;
}

export function locateTableFile(
  table: Pick<SchemaTable, "id" | "name" | "schema">,
  files: Record<string, string>,
): string | null {
  for (const [path, content] of Object.entries(files)) {
    if (findTableBlock(content, table)) {
      return path;
    }
  }
  return null;
}

function escapeDbmlSingleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function quoteColumnType(type: string): string {
  if (/\s/.test(type) && !type.startsWith('"')) {
    return `"${type.replace(/"/g, '\\"')}"`;
  }
  return type;
}

function formatColumnLine(column: SchemaColumn): string {
  const settings: string[] = [];
  if (column.isPrimaryKey) {
    settings.push("pk");
  }
  if (!column.isNullable) {
    settings.push("not null");
  }
  if (column.isUnique) {
    settings.push("unique");
  }
  if (column.note) {
    settings.push(`note: '${escapeDbmlSingleQuoted(column.note)}'`);
  }
  const settingPart =
    settings.length > 0 ? ` [${settings.join(", ")}]` : "";
  const typePart = quoteColumnType(column.type);
  return `  ${column.name} ${typePart}${settingPart}`;
}

function parseTableHeaderParts(line: string): {
  tablePart: string;
  settingsInner: string | null;
  trailing: string;
} | null {
  const match = line.match(
    /^(\s*Table\s+("([^"]+)"|([^\s\[]+)))(\s*\[([^\]]*)\])?(\s*\{?.*)$/i,
  );
  if (!match) {
    return null;
  }
  return {
    tablePart: match[1],
    settingsInner: match[6]?.trim() ?? null,
    trailing: match[7] ?? "",
  };
}

function normalizeHeaderColor(color: string): string {
  const trimmed = color.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function upsertTableSetting(
  settingsInner: string | null,
  key: string,
  value: string | null,
): string | null {
  const headerColorRe = new RegExp(`${key}:\\s*[^,\\]]+`, "i");
  let inner = settingsInner?.trim() ?? "";
  if (value === null) {
    if (!inner) {
      return null;
    }
    inner = inner
      .replace(headerColorRe, "")
      .replace(/,\s*,/g, ",")
      .replace(/^\s*,\s*|\s*,\s*$/g, "")
      .trim();
    return inner || null;
  }
  const setting = `${key}: ${value}`;
  if (headerColorRe.test(inner)) {
    inner = inner.replace(headerColorRe, setting);
  } else if (inner) {
    inner = `${inner}, ${setting}`;
  } else {
    inner = setting;
  }
  return inner;
}

function applyTableHeaderSettings(
  line: string,
  patch: (settingsInner: string | null) => string | null,
): string {
  const parts = parseTableHeaderParts(line);
  if (!parts) {
    return line;
  }
  const nextInner = patch(parts.settingsInner);
  if (!nextInner) {
    return `${parts.tablePart}${parts.trailing}`.replace(/\s+/g, " ").trimEnd();
  }
  const trailing = parts.trailing.trimStart();
  const spacer = trailing ? " " : "";
  return `${parts.tablePart} [${nextInner}]${spacer}${trailing}`.replace(
    /\s+/g,
    " ",
  );
}

export function setTableHeaderColorInContent(
  content: string,
  table: SchemaTable,
  color: string | null,
): string {
  const block = findTableBlock(content, table);
  if (!block) {
    return content;
  }
  const lines = splitLines(content);
  lines[block.headerLine] = applyTableHeaderSettings(
    lines[block.headerLine],
    (inner) =>
      upsertTableSetting(
        inner,
        "headerColor",
        color ? normalizeHeaderColor(color) : null,
      ),
  );
  return joinLines(lines);
}

function columnLinePattern(columnName: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(columnName)}\\s+\\S`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseFieldNameFromLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return null;
  }
  const match = trimmed.match(/^("([^"]+)"|(\w+))\s+\S/);
  if (!match) {
    return null;
  }
  return match[2] ?? match[3] ?? null;
}

function isTableFieldLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return false;
  }
  if (/^(Indexes|Note|settings)\b/i.test(trimmed)) {
    return false;
  }
  if (trimmed === "{" || trimmed === "}") {
    return false;
  }
  return parseFieldNameFromLine(line) !== null;
}

export interface TableFieldLine {
  name: string;
  line: string;
  lineIndex: number;
}

export function listTableFieldLines(
  content: string,
  table: Pick<SchemaTable, "id" | "name" | "schema">,
): TableFieldLine[] {
  const block = findTableBlock(content, table);
  if (!block) {
    return [];
  }
  const lines = splitLines(content);
  const fields: TableFieldLine[] = [];
  for (let i = block.startLine + 1; i < block.endLine; i += 1) {
    if (!isTableFieldLine(lines[i])) {
      continue;
    }
    const name = parseFieldNameFromLine(lines[i]);
    if (name) {
      fields.push({ name, line: lines[i], lineIndex: i });
    }
  }
  return fields;
}

export function reorderColumnsInContent(
  content: string,
  table: SchemaTable,
  orderedNames: string[],
): string {
  const block = findTableBlock(content, table);
  if (!block) {
    return content;
  }
  const fields = listTableFieldLines(content, table);
  if (fields.length === 0) {
    return content;
  }
  const byName = new Map(fields.map((f) => [f.name, f.line]));
  const reorderedLines = orderedNames
    .map((name) => byName.get(name))
    .filter((line): line is string => line !== undefined);
  if (reorderedLines.length !== fields.length) {
    return content;
  }

  const lines = splitLines(content);
  const indices = fields.map((f) => f.lineIndex).sort((a, b) => b - a);
  for (const index of indices) {
    lines.splice(index, 1);
  }
  const insertAt = Math.min(...fields.map((f) => f.lineIndex));
  lines.splice(insertAt, 0, ...reorderedLines);
  return joinLines(lines);
}

export function moveColumnInContent(
  content: string,
  table: SchemaTable,
  columnName: string,
  direction: "up" | "down",
): string {
  const fields = listTableFieldLines(content, table);
  const names = fields.map((f) => f.name);
  const index = names.indexOf(columnName);
  if (index < 0) {
    return content;
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= names.length) {
    return content;
  }
  const next = [...names];
  [next[index], next[target]] = [next[target], next[index]];
  return reorderColumnsInContent(content, table, next);
}

export type AddColumnPlacement =
  | { position: "start" }
  | { position: "end" }
  | { afterColumn: string };

export function addColumnToContent(
  content: string,
  table: SchemaTable,
  column: SchemaColumn,
  placement: AddColumnPlacement = { position: "end" },
): string {
  const block = findTableBlock(content, table);
  if (!block) {
    return content;
  }
  const lines = splitLines(content);
  const line = formatColumnLine(column);
  let insertAt = block.endLine;

  if ("afterColumn" in placement) {
    const fields = listTableFieldLines(content, table);
    const after = fields.find((f) => f.name === placement.afterColumn);
    insertAt = after ? after.lineIndex + 1 : block.endLine;
  } else if (placement.position === "start") {
    insertAt = block.startLine + 1;
  } else {
    const fields = listTableFieldLines(content, table);
    if (fields.length > 0) {
      const last = fields[fields.length - 1];
      insertAt = last.lineIndex + 1;
    } else {
      insertAt = block.startLine + 1;
    }
  }

  lines.splice(insertAt, 0, line);
  return joinLines(lines);
}

export function removeColumnFromContent(
  content: string,
  table: SchemaTable,
  columnName: string,
): string {
  const block = findTableBlock(content, table);
  if (!block) {
    return content;
  }
  const lines = splitLines(content);
  const pattern = columnLinePattern(columnName);
  for (let i = block.startLine + 1; i < block.endLine; i += 1) {
    if (pattern.test(lines[i])) {
      lines.splice(i, 1);
      break;
    }
  }
  return joinLines(lines);
}

export function updateColumnInContent(
  content: string,
  table: SchemaTable,
  previousName: string,
  column: SchemaColumn,
): string {
  const block = findTableBlock(content, table);
  if (!block) {
    return content;
  }
  const lines = splitLines(content);
  const pattern = columnLinePattern(previousName);
  for (let i = block.startLine + 1; i < block.endLine; i += 1) {
    if (pattern.test(lines[i])) {
      lines[i] = formatColumnLine(column);
      return joinLines(lines);
    }
  }
  return content;
}

export function updateTableHeaderInContent(
  content: string,
  table: SchemaTable,
  next: { name?: string; schema?: string },
): string {
  const block = findTableBlock(content, table);
  if (!block) {
    return content;
  }
  const lines = splitLines(content);
  const header = parseTableHeaderLine(lines[block.headerLine]);
  if (!header) {
    return content;
  }
  const name = next.name ?? table.name;
  const schema = next.schema ?? table.schema;
  const ref = schema && schema !== "public" ? `${schema}.${name}` : name;
  const line = lines[block.headerLine];
  const indent = line.match(/^\s*/)?.[0] ?? "";
  const parts = parseTableHeaderParts(line);
  if (parts) {
    const settings =
      parts.settingsInner && parts.settingsInner.length > 0
        ? ` [${parts.settingsInner}]`
        : "";
    const trailing = parts.trailing.trim();
    lines[block.headerLine] = trailing
      ? `${indent}Table ${ref}${settings} ${trailing}`
      : `${indent}Table ${ref}${settings}`;
  } else {
    lines[block.headerLine] = line.replace(
      /Table\s+("([^"]+)"|([^\s\[]+))/i,
      `Table ${ref}`,
    );
  }
  return joinLines(lines);
}

export interface TableReferenceIdentity {
  schema?: string;
  name: string;
}

/** How a table may appear before `.column` or `.(cols)` in Ref lines and inline refs. */
export function tableReferenceAliases(
  schema: string | undefined,
  name: string,
): string[] {
  const normalizedSchema = schema ?? "public";
  const aliases: string[] = [];
  if (normalizedSchema !== "public") {
    aliases.push(`${normalizedSchema}.${name}`);
  }
  aliases.push(name);
  if (normalizedSchema === "public") {
    aliases.push(`public.${name}`);
  }
  return [...new Set(aliases)].sort((a, b) => b.length - a.length);
}

export function formatTableReference(
  schema: string | undefined,
  name: string,
): string {
  const normalizedSchema = schema ?? "public";
  return normalizedSchema === "public" ? name : `${normalizedSchema}.${name}`;
}

function replaceTableReferenceAlias(
  content: string,
  oldAlias: string,
  newAlias: string,
): string {
  if (oldAlias === newAlias) {
    return content;
  }
  const segments = oldAlias.split(".").map(escapeRegExp);
  const pattern = new RegExp(
    `(?<![\\w.])${segments.join("\\.")}(?=\\.(?:\\(|"|'|[A-Za-z_]))`,
    "g",
  );
  return content.replace(pattern, newAlias);
}

/** Updates Ref statements and inline `[ref: …]` endpoints when a table is renamed or re-scoped. */
export function rewriteTableReferencesInContent(
  content: string,
  from: TableReferenceIdentity,
  to: TableReferenceIdentity,
): string {
  if (
    from.name === to.name &&
    (from.schema ?? "public") === (to.schema ?? "public")
  ) {
    return content;
  }
  const newRef = formatTableReference(to.schema, to.name);
  let next = content;
  for (const alias of tableReferenceAliases(from.schema, from.name)) {
    next = replaceTableReferenceAlias(next, alias, newRef);
  }
  return next;
}

export function formatNewTableBlock(options: {
  name: string;
  schema?: string;
  headerColor?: string;
  columns?: SchemaColumn[];
}): string {
  const tableName =
    options.schema && options.schema !== "public"
      ? `${options.schema}.${options.name}`
      : options.name;
  const headerSettings: string[] = [];
  if (options.headerColor) {
    headerSettings.push(`headercolor: ${normalizeHeaderColor(options.headerColor)}`);
  }
  const settingsPart =
    headerSettings.length > 0 ? ` [${headerSettings.join(", ")}]` : "";

  const cols =
    options.columns && options.columns.length > 0
      ? options.columns
      : [
          {
            name: "id",
            type: "serial",
            isPrimaryKey: true,
            isNullable: false,
            isUnique: false,
          },
        ];

  const colLines = cols.map(formatColumnLine).join("\n");
  return `Table ${tableName}${settingsPart} {\n${colLines}\n}\n`;
}

