import {
  addColumnToContent,
  type AddColumnPlacement,
  findTableBlock,
  locateTableFile,
  moveColumnInContent,
  removeColumnFromContent,
  reorderColumnsInContent,
  updateColumnInContent,
  setTableHeaderColorInContent,
  rewriteTableReferencesInContent,
  updateTableHeaderInContent,
  formatNewTableBlock,
} from "./dbml-edit";
import type { SchemaColumn, SchemaTable } from "../../types/schema";
import { useEditorStore } from "../../stores/editor-store";
import { readProjectFile } from "../../services/tauri-bridge";

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

