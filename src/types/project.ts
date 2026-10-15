export interface ProjectFileEntry {
  relativePath: string;
  isDirectory: boolean;
}

export interface FileContent {
  content: string;
  modifiedMs: number | null;
}
