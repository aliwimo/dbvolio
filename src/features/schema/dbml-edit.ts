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

function findBraceBlockEnd(
  lines: string[],
  startLine: number,
): number | null {
  let depth = 0;
  let started = false;
  for (let j = startLine; j < lines.length; j += 1) {
    for (const char of lines[j]) {
      if (char === "{") {
        depth += 1;
        started = true;
      } else if (char === "}") {
        depth -= 1;
      }
    }
    if (started && depth <= 0) {
      return j;
    }
  }
  return null;
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
    const endLine = findBraceBlockEnd(lines, i);
    return endLine === null
      ? null
      : { startLine: i, endLine, headerLine: i };
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

const TABLE_GROUP_HEADER_LINE =
  /^TableGroup\s+("([^"]+)"|([^\s\[]+))(?:\s*\[[^\]]*\])?\s*\{?\s*$/i;

const GROUP_MEMBER_LINE =
  /^(?:"([^"]+)"|([A-Za-z_][\w$]*))(?:\.(?:"([^"]+)"|([A-Za-z_][\w$]*)))?\s*$/;

export function parseTableGroupHeaderLine(
  line: string,
): ParsedTableHeader | null {
  const trimmed = line.trim();
  const inlineBlock = trimmed.indexOf("{");
  const header =
    inlineBlock >= 0 ? trimmed.slice(0, inlineBlock).trim() : trimmed;
  const match = header.match(TABLE_GROUP_HEADER_LINE);
  if (!match) {
    return null;
  }
  const unquoted = (match[2] ?? match[3]).replace(/^"|"$/g, "");
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

export function findTableGroupBlock(
  content: string,
  group: { name: string; schema?: string },
): TableBlockLocation | null {
  const lines = splitLines(content);
  const groupSchema = group.schema ?? "public";
  let fallback: TableBlockLocation | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const header = parseTableGroupHeaderLine(lines[i]);
    if (!header || header.name !== group.name) {
      continue;
    }
    const endLine = findBraceBlockEnd(lines, i);
    if (endLine === null) {
      continue;
    }
    const location = { startLine: i, endLine, headerLine: i };
    if ((header.schema ?? "public") === groupSchema) {
      return location;
    }
    fallback ??= location;
  }
  return fallback;
}

const GROUP_MEMBER_TOKEN =
  /(?:"[^"]+"|[A-Za-z_][\w$]*)(?:\.(?:"[^"]+"|[A-Za-z_][\w$]*))?/g;

function tokenizeGroupMembers(inner: string): string[] {
  return inner.trim().match(GROUP_MEMBER_TOKEN) ?? [];
}

interface ParsedGroupMember {
  schema?: string;
  name: string;
}

function parseGroupMemberLine(line: string): ParsedGroupMember | null {
  const match = line.trim().match(GROUP_MEMBER_LINE);
  if (!match) {
    return null;
  }
  const first = match[1] ?? match[2];
  const second = match[3] ?? match[4];
  if (second) {
    return { schema: first, name: second };
  }
  return { name: first };
}

function groupMemberMatchesTable(
  member: ParsedGroupMember,
  groupSchema: string | undefined,
  table: Pick<SchemaTable, "name" | "schema">,
): boolean {
  const memberSchema = member.schema ?? groupSchema ?? "public";
  return (
    member.name === table.name &&
    memberSchema === (table.schema ?? "public")
  );
}

function quoteDbmlIdent(name: string): string {
  return /^[A-Za-z_][\w$]*$/.test(name)
    ? name
    : `"${name.replace(/"/g, '\\"')}"`;
}

export function formatGroupMemberRef(
  groupSchema: string | undefined,
  table: Pick<SchemaTable, "name" | "schema">,
): string {
  const tableSchema = table.schema ?? "public";
  if ((groupSchema ?? "public") !== tableSchema) {
    return `${quoteDbmlIdent(tableSchema)}.${quoteDbmlIdent(table.name)}`;
  }
  return quoteDbmlIdent(table.name);
}

function groupBlockHasMember(
  lines: string[],
  block: TableBlockLocation,
  groupSchema: string | undefined,
  table: Pick<SchemaTable, "name" | "schema">,
): boolean {
  if (block.startLine === block.endLine) {
    const line = lines[block.startLine];
    const inner = line.slice(line.indexOf("{") + 1, line.lastIndexOf("}"));
    return tokenizeGroupMembers(inner).some((token) => {
      const member = parseGroupMemberLine(token);
      return member
        ? groupMemberMatchesTable(member, groupSchema, table)
        : false;
    });
  }
  for (let i = block.startLine + 1; i < block.endLine; i += 1) {
    const member = parseGroupMemberLine(lines[i]);
    if (member && groupMemberMatchesTable(member, groupSchema, table)) {
      return true;
    }
  }
  return false;
}

export function addTableToGroupInContent(
  content: string,
  group: { name: string; schema?: string },
  table: Pick<SchemaTable, "name" | "schema">,
): string {
  const block = findTableGroupBlock(content, group);
  if (!block) {
    return content;
  }
  const lines = splitLines(content);
  if (groupBlockHasMember(lines, block, group.schema, table)) {
    return content;
  }
  const memberLine = `  ${formatGroupMemberRef(group.schema, table)}`;

  if (block.startLine === block.endLine) {
    const line = lines[block.startLine];
    const open = line.indexOf("{");
    const close = line.lastIndexOf("}");
    if (open === -1 || close < open) {
      return content;
    }
    const indent = line.match(/^\s*/)?.[0] ?? "";
    const head = line.slice(0, open + 1).replace(/\s+$/, "");
    const inner = line.slice(open + 1, close).trim();
    lines.splice(
      block.startLine,
      1,
      head,
      ...(inner ? [`${indent}  ${inner}`] : []),
      `${indent}  ${memberLine.trim()}`,
      `${indent}}`,
    );
    return joinLines(lines);
  }

  let insertAt = block.startLine + 1;
  for (let i = block.startLine + 1; i < block.endLine; i += 1) {
    if (parseGroupMemberLine(lines[i])) {
      insertAt = i + 1;
    }
  }
  lines.splice(insertAt, 0, memberLine);
  return joinLines(lines);
}

function removeTableFromGroupBlockLines(
  lines: string[],
  block: TableBlockLocation,
  groupSchema: string | undefined,
  table: Pick<SchemaTable, "name" | "schema">,
): boolean {
  if (block.startLine === block.endLine) {
    const line = lines[block.startLine];
    const open = line.indexOf("{");
    const close = line.lastIndexOf("}");
    if (open === -1 || close < open) {
      return false;
    }
    const inner = line.slice(open + 1, close).trim();
    const tokens = tokenizeGroupMembers(inner);
    const kept = tokens.filter((token) => {
      const member = parseGroupMemberLine(token);
      return member
        ? !groupMemberMatchesTable(member, groupSchema, table)
        : true;
    });
    if (kept.length === tokens.length) {
      return false;
    }
    const head = line.slice(0, open + 1).replace(/\s+$/, "");
    lines[block.startLine] = kept.length
      ? `${head} ${kept.join(" ")} }`
      : `${head} }`;
    return true;
  }

  let changed = false;
  for (let i = block.endLine - 1; i > block.startLine; i -= 1) {
    const member = parseGroupMemberLine(lines[i]);
    if (member && groupMemberMatchesTable(member, groupSchema, table)) {
      lines.splice(i, 1);
      changed = true;
    }
  }
  return changed;
}

export function removeTableFromAllTableGroupsInContent(
  content: string,
  table: Pick<SchemaTable, "name" | "schema">,
): string {
  const lines = splitLines(content);
  let changed = false;
  for (let i = 0; i < lines.length; i += 1) {
    const header = parseTableGroupHeaderLine(lines[i]);
    if (!header) {
      continue;
    }
    const endLine = findBraceBlockEnd(lines, i);
    if (endLine === null) {
      continue;
    }
    changed =
      removeTableFromGroupBlockLines(
        lines,
        { startLine: i, endLine, headerLine: i },
        header.schema,
        table,
      ) || changed;
  }
  return changed ? joinLines(lines) : content;
}

export function formatNewTableGroupBlock(
  group: { name: string; schema?: string },
  table: Pick<SchemaTable, "name" | "schema">,
): string {
  const groupName =
    group.schema && group.schema !== "public"
      ? `${quoteDbmlIdent(group.schema)}.${quoteDbmlIdent(group.name)}`
      : quoteDbmlIdent(group.name);
  const member = formatGroupMemberRef(group.schema, table);
  return `TableGroup ${groupName} {\n  ${member}\n}\n`;
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

