import { open } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import {
  listProjectFiles,
  setProjectRoot,
} from "../services/tauri-bridge";
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
  files: ProjectFileEntry[];
  entryPoint: string | null;
  recentProjects: string[];
  openProjectDialog: () => Promise<void>;
  openProjectPath: (path: string) => Promise<void>;
  removeRecentProject: (path: string) => void;
  clearRecentProjects: () => void;
  setEntryPoint: (relativePath: string) => void;
  refreshFiles: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectRoot: null,
  projectName: null,
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

  openProjectPath: async (path) => {
    try {
      await setProjectRoot(path);
      const files = await listProjectFiles();
      const dbmlFiles = files.filter(
        (f) => !f.isDirectory && f.relativePath.endsWith(".dbml"),
      );
      const defaultEntry =
        dbmlFiles.find((f) => f.relativePath === "main.dbml")?.relativePath ??
        dbmlFiles[0]?.relativePath ??
        null;
      const recentProjects = pushRecent(path);
      const name = path.split(/[/\\]/).pop() ?? path;
      set({
        projectRoot: path,
        projectName: name,
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
}));
