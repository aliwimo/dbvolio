/** Split an absolute path from the file picker into project root + file name. */
export function splitDbmlFilePath(filePath: string): {
  projectRoot: string;
  relativePath: string;
} {
  const relativePath = filePath.split(/[/\\]/).pop();
  if (!relativePath?.toLowerCase().endsWith(".dbml")) {
    throw new Error("Only .dbml files can be opened");
  }

  const sepIndex = Math.max(
    filePath.lastIndexOf("/"),
    filePath.lastIndexOf("\\"),
  );
  if (sepIndex <= 0) {
    throw new Error("Invalid file path");
  }

  const projectRoot = filePath.slice(0, sepIndex);
  if (!projectRoot) {
    throw new Error("Invalid file path");
  }

  return { projectRoot, relativePath };
}
