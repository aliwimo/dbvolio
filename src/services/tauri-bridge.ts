import { invoke } from "@tauri-apps/api/core";
import type { FileContent, ProjectFileEntry } from "../types/project";

function mapFileContent(raw: {
  content: string;
  modified_ms: number | null;
}): FileContent {
  return {
    content: raw.content,
    modifiedMs: raw.modified_ms,
  };
}

function mapFileEntry(raw: {
  relative_path: string;
  is_directory: boolean;
}): ProjectFileEntry {
  return {
    relativePath: raw.relative_path,
    isDirectory: raw.is_directory,
  };
}

export async function setProjectRoot(path: string): Promise<void> {
  await invoke("set_project_root", { path });
}

export async function getProjectRoot(): Promise<string | null> {
  return invoke<string | null>("get_project_root");
}

export async function clearProject(): Promise<void> {
  await invoke("clear_project");
}

export async function listProjectFiles(): Promise<ProjectFileEntry[]> {
  const entries = await invoke<
    { relative_path: string; is_directory: boolean }[]
  >("list_project_files");
  return entries.map(mapFileEntry);
}

export async function readProjectFile(
  relativePath: string,
): Promise<FileContent> {
  const raw = await invoke<{ content: string; modified_ms: number | null }>(
    "read_project_file",
    { relativePath },
  );
  return mapFileContent(raw);
}

export async function writeProjectFile(
  relativePath: string,
  content: string,
  expectedModifiedMs?: number | null,
): Promise<FileContent> {
  const raw = await invoke<{ content: string; modified_ms: number | null }>(
    "write_project_file",
    {
      relativePath,
      content,
      expectedModifiedMs: expectedModifiedMs ?? null,
    },
  );
  return mapFileContent(raw);
}

export async function createProjectFile(
  relativePath: string,
  content?: string,
): Promise<FileContent> {
  const raw = await invoke<{ content: string; modified_ms: number | null }>(
    "create_project_file",
    { relativePath, content: content ?? null },
  );
  return mapFileContent(raw);
}

export async function renameProjectFile(
  fromRelative: string,
  toRelative: string,
): Promise<void> {
  await invoke("rename_project_file", { fromRelative, toRelative });
}

export async function deleteProjectFile(relativePath: string): Promise<void> {
  await invoke("delete_project_file", { relativePath });
}

export async function readLayoutMetadata(): Promise<string | null> {
  return invoke<string | null>("read_layout_metadata");
}

export async function writeLayoutMetadata(content: string): Promise<void> {
  await invoke("write_layout_metadata", { content });
}

export interface DbmlOpenPayload {
  projectRoot: string;
  /** Omitted when opening a project folder (default entry is chosen). */
  relativePath?: string;
}

export async function takePendingDbmlOpens(): Promise<DbmlOpenPayload[]> {
  return invoke<DbmlOpenPayload[]>("take_pending_dbml_opens");
}
