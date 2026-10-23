import {
  addColumnToContent,
  type AddColumnPlacement,
  addTableToGroupInContent,
  findTableBlock,
  findTableGroupBlock,
  formatNewTableGroupBlock,
  locateTableFile,
  moveColumnInContent,
  removeColumnFromContent,
  removeTableFromAllTableGroupsInContent,
  reorderColumnsInContent,
  updateColumnInContent,
  setTableHeaderColorInContent,
  rewriteTableReferencesInContent,
  updateTableHeaderInContent,
  formatNewTableBlock,
} from "./dbml-edit";
import type { SchemaColumn, SchemaTable } from "../../types/schema";
import type { ProjectScope } from "../open/project-scope-files";
import { useEditorStore } from "../../stores/editor-store";
import { readProjectFile } from "../../services/tauri-bridge";

export interface DiagramFileScope {
  entryPoint: string | null;
  projectScope: ProjectScope;
}

function collectImportPaths(content: string): string[] {
  const paths: string[] = [];
  let inUseStatement = false;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!inUseStatement) {
      if (!/^use\b/i.test(line)) {
        continue;
      }
      inUseStatement = true;
    }
    const from = line.match(/\bfrom\s*['"]([^'"]+)['"]/);
    if (from) {
      paths.push(from[1]);
      inUseStatement = false;
    }
  }
  return paths;
}

function resolveImportPath(fromPath: string, specifier: string): string {
  const base = specifier.startsWith("/")
    ? specifier.slice(1).split("/")
    : [...fromPath.split("/").slice(0, -1), ...specifier.split("/")];
  const parts: string[] = [];
  for (const part of base) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

/**
 * Files that make up the current diagram: the entry point plus everything it
 * imports. Other DBML files in the project are separate diagrams and must not
 * be touched — they may define tables with the same names.
 */
function resolveDiagramFiles(
  fileMap: Record<string, string>,
  scope: DiagramFileScope,
): string[] {
  const { entryPoint, projectScope } = scope;
  if (!entryPoint || fileMap[entryPoint] === undefined) {
    return Object.keys(fileMap);
  }
  if (projectScope === "file") {
    return [entryPoint];
  }
  const files: string[] = [];
  const seen = new Set<string>();
  const queue = [entryPoint];
  while (queue.length > 0) {
    const path = queue.shift()!;
    if (seen.has(path) || fileMap[path] === undefined) {
      continue;
    }
    seen.add(path);
    files.push(path);
    for (const specifier of collectImportPaths(fileMap[path])) {
      queue.push(resolveImportPath(path, specifier));
    }
  }
  return files;
}

async function commitFileContent(
  relativePath: string,
  content: string,
): Promise<void> {
  const editor = useEditorStore.getState();
  const open = editor.tabs.find((t) => t.relativePath === relativePath);
  if (open) {
    editor.updateContent(relativePath, content);
    return;
  }
  await editor.openFile(relativePath);
  editor.updateContent(relativePath, content);
}

async function resolveFileMap(
  projectFiles: { relativePath: string }[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const openContents = useEditorStore.getState().getOpenFileContents();
  for (const file of projectFiles) {
    if (!file.relativePath.endsWith(".dbml")) {
      continue;
    }
    if (openContents[file.relativePath] !== undefined) {
      map[file.relativePath] = openContents[file.relativePath];
    } else {
      try {
        map[file.relativePath] = (await readProjectFile(file.relativePath))
          .content;
      } catch {
        /* skip */
      }
    }
  }
  return map;
}

export async function applyAddColumn(
  table: SchemaTable,
  column: SchemaColumn,
  projectFiles: { relativePath: string }[],
  placement?: AddColumnPlacement,
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const content = fileMap[path];
  const next = addColumnToContent(content, table, column, placement);
  await commitFileContent(path, next);
  return true;
}

export async function applyMoveColumn(
  table: SchemaTable,
  columnName: string,
  direction: "up" | "down",
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const next = moveColumnInContent(
    fileMap[path],
    table,
    columnName,
    direction,
  );
  await commitFileContent(path, next);
  return true;
}

export async function applyReorderColumns(
  table: SchemaTable,
  orderedNames: string[],
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const next = reorderColumnsInContent(fileMap[path], table, orderedNames);
  await commitFileContent(path, next);
  return true;
}

export async function applyRemoveColumn(
  table: SchemaTable,
  columnName: string,
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const next = removeColumnFromContent(fileMap[path], table, columnName);
  await commitFileContent(path, next);
  return true;
}

export async function applyUpdateColumn(
  table: SchemaTable,
  previousName: string,
  column: SchemaColumn,
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const next = updateColumnInContent(
    fileMap[path],
    table,
    previousName,
    column,
  );
  await commitFileContent(path, next);
  return true;
}

export async function applySetTableHeaderColor(
  table: SchemaTable,
  color: string | null,
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const next = setTableHeaderColorInContent(fileMap[path], table, color);
  await commitFileContent(path, next);
  return true;
}

export async function applyUpdateTableMeta(
  table: SchemaTable,
  meta: { name?: string; schema?: string },
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const nextName = meta.name?.trim() || table.name;
  const nextSchema =
    meta.schema !== undefined ? meta.schema.trim() || undefined : table.schema;
  const from = { schema: table.schema, name: table.name };
  const to = { schema: nextSchema, name: nextName };

  const pending: Record<string, string> = {};
  for (const [filePath, content] of Object.entries(fileMap)) {
    let next = rewriteTableReferencesInContent(content, from, to);
    if (filePath === path) {
      next = updateTableHeaderInContent(next, table, {
        name: nextName,
        schema: nextSchema,
      });
    }
    if (next !== content) {
      pending[filePath] = next;
    }
  }

  for (const [filePath, content] of Object.entries(pending)) {
    await commitFileContent(filePath, content);
  }
  return true;
}

export async function openTableSourceFile(
  table: SchemaTable,
  projectFiles: { relativePath: string }[],
): Promise<string | null> {
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return null;
  }
  await useEditorStore.getState().openFile(path);
  return path;
}

/** Scrolls the editor to a table when its DBML file is already open in a tab. */
export async function revealTableInEditorIfOpen(
  table: SchemaTable,
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const editor = useEditorStore.getState();
  const fileMap = await resolveFileMap(projectFiles);
  const path = locateTableFile(table, fileMap);
  if (!path) {
    return false;
  }
  const openTab = editor.tabs.find((tab) => tab.relativePath === path);
  if (!openTab) {
    return false;
  }
  const block = findTableBlock(fileMap[path], table);
  if (!block) {
    return false;
  }
  if (editor.activePath !== path) {
    editor.setActivePath(path);
  }
  editor.requestEditorReveal(path, block.headerLine + 1);
  return true;
}

function appendBlock(content: string, block: string): string {
  if (!content) {
    return block;
  }
  const spacer = content.endsWith("\n\n")
    ? ""
    : content.endsWith("\n")
      ? "\n"
      : "\n\n";
  return `${content}${spacer}${block}`;
}

export async function applyAssignTableToGroup(
  table: SchemaTable,
  group: { name: string; schema?: string } | null,
  projectFiles: { relativePath: string }[],
  scope: DiagramFileScope,
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const diagramFiles = resolveDiagramFiles(fileMap, scope);
  const tablePath =
    diagramFiles.find((path) => findTableBlock(fileMap[path], table)) ?? null;
  if (!tablePath) {
    return false;
  }

  const working = { ...fileMap };
  for (const path of diagramFiles) {
    working[path] = removeTableFromAllTableGroupsInContent(working[path], table);
  }

  if (group) {
    const target = { ...group, name: group.name.trim() };
    if (!target.name) {
      return false;
    }
    const groupPath =
      diagramFiles.find((path) =>
        findTableGroupBlock(working[path], target),
      ) ?? null;
    if (groupPath) {
      working[groupPath] = addTableToGroupInContent(
        working[groupPath],
        target,
        table,
      );
    } else {
      working[tablePath] = appendBlock(
        working[tablePath] ?? "",
        formatNewTableGroupBlock(target, table),
      );
    }
  }

  for (const path of diagramFiles) {
    if (working[path] !== fileMap[path]) {
      await commitFileContent(path, working[path]);
    }
  }
  return true;
}

export async function applyCreateTable(
  targetFilePath: string,
  tableData: {
    name: string;
    schema?: string;
    headerColor?: string;
    columns?: SchemaColumn[];
  },
  projectFiles: { relativePath: string }[],
): Promise<boolean> {
  const fileMap = await resolveFileMap(projectFiles);
  const currentContent = fileMap[targetFilePath] ?? "";
  const tableBlock = formatNewTableBlock(tableData);
  const spacer = currentContent.length > 0 && !currentContent.endsWith("\n\n")
    ? currentContent.endsWith("\n")
      ? "\n"
      : "\n\n"
    : "";
  const nextContent = `${currentContent}${spacer}${tableBlock}`;
  await commitFileContent(targetFilePath, nextContent);
  return true;
}

