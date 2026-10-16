import type { ProjectFileEntry } from "../../types/project";

export type ProjectScope = "folder" | "file";

export function filesForScope(
  files: ProjectFileEntry[],
  scope: ProjectScope,
  entryPoint: string | null,
): ProjectFileEntry[] {
  if (scope !== "file" || !entryPoint) {
    return files;
  }
  return files.filter(
    (f) => !f.isDirectory && f.relativePath === entryPoint,
  );
}
