import type { ProjectFileEntry } from "../../types/project";

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
}

export function filterDbmlEntries(entries: ProjectFileEntry[]): ProjectFileEntry[] {
  const dbmlFiles = entries.filter(
    (entry) => !entry.isDirectory && entry.relativePath.endsWith(".dbml"),
  );
  if (dbmlFiles.length === 0) {
    return [];
  }

  const keepPaths = new Set<string>();
  for (const file of dbmlFiles) {
    keepPaths.add(file.relativePath);
    const parts = file.relativePath.split("/");
    for (let i = 1; i < parts.length; i += 1) {
      keepPaths.add(parts.slice(0, i).join("/"));
    }
  }

  return entries.filter((entry) => {
    if (entry.isDirectory) {
      return keepPaths.has(entry.relativePath);
    }
    return entry.relativePath.endsWith(".dbml");
  });
}

export function buildTree(entries: ProjectFileEntry[]): TreeNode[] {
  const root: TreeNode[] = [];

  const ensure = (
    nodes: TreeNode[],
    parts: string[],
    index: number,
  ): TreeNode => {
    const name = parts[index];
    const isLast = index === parts.length - 1;
    const path = parts.slice(0, index + 1).join("/");
    let node = nodes.find((n) => n.name === name);
    if (!node) {
      node = {
        name,
        path,
        isDirectory: !isLast,
        children: [],
      };
      nodes.push(node);
    }
    return node;
  };

  for (const entry of entries) {
    const parts = entry.relativePath.split("/");
    let nodes = root;
    for (let i = 0; i < parts.length; i += 1) {
      const node = ensure(nodes, parts, i);
      if (i < parts.length - 1) {
        nodes = node.children;
      } else {
        node.isDirectory = entry.isDirectory;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}

export function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return nodes;
  }

  const walk = (node: TreeNode): TreeNode | null => {
    if (node.isDirectory) {
      const children = node.children
        .map(walk)
        .filter((child): child is TreeNode => child !== null);
      if (children.length > 0) {
        return { ...node, children };
      }
      return null;
    }
    if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
      return node;
    }
    return null;
  };

  return nodes.map(walk).filter((node): node is TreeNode => node !== null);
}

export function isDbmlPath(path: string): boolean {
  return path.endsWith(".dbml");
}

export function countLeafFiles(nodes: TreeNode[]): number {
  let count = 0;
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (node.isDirectory) {
        walk(node.children);
      } else {
        count += 1;
      }
    }
  };
  walk(nodes);
  return count;
}

export function collectFolderPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (node.isDirectory && node.children.length > 0) {
        paths.push(node.path);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return paths;
}

export function ancestorFolderPaths(relativePath: string): string[] {
  const parts = relativePath.split("/");
  if (parts.length <= 1) {
    return [];
  }
  const folders: string[] = [];
  for (let i = 1; i < parts.length; i += 1) {
    folders.push(parts.slice(0, i).join("/"));
  }
  return folders;
}

export function countDbmlFiles(nodes: TreeNode[]): number {
  let count = 0;
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (node.isDirectory) {
        walk(node.children);
      } else if (isDbmlPath(node.path)) {
        count += 1;
      }
    }
  };
  walk(nodes);
  return count;
}
