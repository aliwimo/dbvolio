import { open } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import type { ProjectScope } from "../features/open/project-scope-files";
import { splitDbmlFilePath } from "../features/open/split-dbml-file-path";
import {
  clearProject,
  getProjectRoot,
  listProjectFiles,
  setProjectRoot,
} from "../services/tauri-bridge";
import { useDiagramStore } from "./diagram-store";
import { useEditorStore } from "./editor-store";
import type { ProjectFileEntry } from "../types/project";

const RECENT_KEY = "dbvolio-recent-projects";
const MAX_RECENT = 8;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(recent: string[]): string[] {
  const trimmed = recent.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  return trimmed;
}

function pushRecent(path: string): string[] {
  const recent = loadRecent().filter((p) => p !== path);
  recent.unshift(path);
  return saveRecent(recent);
}

function removeRecentPath(path: string): string[] {
  return saveRecent(loadRecent().filter((p) => p !== path));
}

interface ProjectState {
  projectRoot: string | null;
  projectName: string | null;
  projectScope: ProjectScope;
  files: ProjectFileEntry[];
  entryPoint: string | null;
  recentProjects: string[];
  openProjectDialog: () => Promise<void>;
  openDbmlFileDialog: () => Promise<void>;
  openProjectPath: (path: string) => Promise<void>;
  openProjectAtFile: (projectRoot: string, relativePath: string) => Promise<void>;
  removeRecentProject: (path: string) => void;
  clearRecentProjects: () => void;
  setEntryPoint: (relativePath: string) => void;
  refreshFiles: () => Promise<void>;
  closeProject: () => Promise<void>;
}

function resetDiagramState(): void {
  useDiagramStore.setState({
    model: null,
    lastValidModel: null,
    isStale: false,
    diagnostics: [],
    nodes: [],
    edges: [],
    selectedTableId: null,
    hoveredTableId: null,
    searchQuery: "",
  });
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectRoot: null,
  projectName: null,
  projectScope: "folder",
  files: [],
  entryPoint: null,
  recentProjects: loadRecent(),

  openProjectDialog: async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open DBML project folder",
    });
    if (typeof selected === "string") {
      await get().openProjectPath(selected);
    }
  },

  openDbmlFileDialog: async () => {
    const selected = await open({
      directory: false,
      multiple: false,
      title: "Open DBML file",
      filters: [{ name: "DBML", extensions: ["dbml"] }],
    });
    if (typeof selected === "string") {
      const { projectRoot, relativePath } = splitDbmlFilePath(selected);
      await get().openProjectAtFile(projectRoot, relativePath);
    }
  },

  openProjectPath: async (path) => {
    try {
      const priorRoot = get().projectRoot;
      await setProjectRoot(path);
      const resolvedRoot = (await getProjectRoot()) ?? path;
      if (priorRoot !== resolvedRoot) {
        useEditorStore.getState().resetSession();
      }
      const files = await listProjectFiles();
      const dbmlFiles = files.filter(
        (f) => !f.isDirectory && f.relativePath.endsWith(".dbml"),
      );
      const defaultEntry =
        dbmlFiles.find((f) => f.relativePath === "main.dbml")?.relativePath ??
        dbmlFiles[0]?.relativePath ??
        null;
      const recentProjects = pushRecent(resolvedRoot);
      const name = resolvedRoot.split(/[/\\]/).pop() ?? resolvedRoot;
      set({
        projectRoot: resolvedRoot,
        projectName: name,
        projectScope: "folder",
        files,
        entryPoint: defaultEntry,
        recentProjects,
      });
    } catch {
      const recentProjects = removeRecentPath(path);
      set({ recentProjects });
      throw new Error(`Could not open project at ${path}`);
    }
  },

  openProjectAtFile: async (projectRoot, relativePath) => {
    try {
      const priorRoot = get().projectRoot;
      const priorEntry = get().entryPoint;
      await setProjectRoot(projectRoot);
      const resolvedRoot = (await getProjectRoot()) ?? projectRoot;
      const files = await listProjectFiles();
      const entry =
        files.find(
          (f) => !f.isDirectory && f.relativePath === relativePath,
        )?.relativePath ??
        files.find(
          (f) =>
            !f.isDirectory &&
            f.relativePath.toLowerCase() === relativePath.toLowerCase(),
        )?.relativePath;
      if (!entry) {
        throw new Error(`File not found in project: ${relativePath}`);
      }
      if (priorRoot !== resolvedRoot || priorEntry !== entry) {
        useEditorStore.getState().resetSession();
      }
      const recentProjects = pushRecent(resolvedRoot);
      set({
        projectRoot: resolvedRoot,
        projectName: entry.split(/[/\\]/).pop() ?? entry,
        projectScope: "file",
        files,
        entryPoint: entry,
        recentProjects,
      });
    } catch (err) {
      const recentProjects = removeRecentPath(projectRoot);
      set({ recentProjects });
      if (err instanceof Error) {
        throw err;
      }
      throw new Error(`Could not open ${relativePath}`);
    }
  },

  removeRecentProject: (path) => {
    set({ recentProjects: removeRecentPath(path) });
  },

  clearRecentProjects: () => {
    saveRecent([]);
    set({ recentProjects: [] });
  },

  setEntryPoint: (relativePath) => set({ entryPoint: relativePath }),

  refreshFiles: async () => {
    const files = await listProjectFiles();
    set({ files });
  },

  closeProject: async () => {
    if (!get().projectRoot) {
      return;
    }
    const dirtyCount = useEditorStore
      .getState()
      .tabs.filter((tab) => tab.isDirty).length;
    if (dirtyCount > 0) {
      const message =
        dirtyCount === 1
          ? "You have unsaved changes. Close without saving?"
          : `You have unsaved changes in ${dirtyCount} files. Close without saving?`;
      const ok = window.confirm(message);
      if (!ok) {
        return;
      }
    }
    await clearProject();
    useEditorStore.getState().resetSession();
    resetDiagramState();
    set({
      projectRoot: null,
      projectName: null,
      projectScope: "folder",
      files: [],
      entryPoint: null,
    });
  },
}));
