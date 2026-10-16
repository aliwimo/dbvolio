import { create } from "zustand";
import {
  createProjectFile,
  deleteProjectFile,
  readProjectFile,
  renameProjectFile,
  writeProjectFile,
} from "../services/tauri-bridge";

export interface EditorTab {
  relativePath: string;
  content: string;
  savedContent: string;
  modifiedMs: number | null;
  isDirty: boolean;
}

export interface EditorRevealRequest {
  relativePath: string;
  /** 1-based line number for Monaco. */
  line: number;
}

interface EditorState {
  tabs: EditorTab[];
  activePath: string | null;
  externalConflict: string | null;
  /** Bumps when any tab content changes (drives diagram re-parse). */
  contentRevision: number;
  pendingEditorReveal: EditorRevealRequest | null;
  requestEditorReveal: (relativePath: string, line: number) => void;
  clearEditorReveal: () => void;
  openFile: (relativePath: string) => Promise<void>;
  closeTab: (relativePath: string) => void;
  setActivePath: (relativePath: string) => void;
  updateContent: (relativePath: string, content: string) => void;
  saveActive: () => Promise<boolean>;
  saveFile: (relativePath: string) => Promise<boolean>;
  reloadFromDisk: (relativePath: string) => Promise<void>;
  createFile: (relativePath: string) => Promise<void>;
  renameFile: (from: string, to: string) => Promise<void>;
  deleteFile: (relativePath: string) => Promise<void>;
  getOpenFileContents: () => Record<string, string>;
  resetSession: () => void;
}

function markDirty(tab: EditorTab, content: string): EditorTab {
  return {
    ...tab,
    content,
    isDirty: content !== tab.savedContent,
  };
}

/** Coalesces concurrent openFile calls (e.g. Strict Mode + entry-point effect). */
const openFileInFlight = new Map<string, Promise<void>>();

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activePath: null,
  externalConflict: null,
  contentRevision: 0,
  pendingEditorReveal: null,

  requestEditorReveal: (relativePath, line) => {
    set({ pendingEditorReveal: { relativePath, line } });
  },

  clearEditorReveal: () => set({ pendingEditorReveal: null }),

  openFile: async (relativePath) => {
    const existing = get().tabs.find((t) => t.relativePath === relativePath);
    if (existing) {
      set({ activePath: relativePath });
      return;
    }

    const inFlight = openFileInFlight.get(relativePath);
    if (inFlight) {
      await inFlight;
      set({ activePath: relativePath });
      return;
    }

    const task = (async () => {
      const file = await readProjectFile(relativePath);
      const tab: EditorTab = {
        relativePath,
        content: file.content,
        savedContent: file.content,
        modifiedMs: file.modifiedMs,
        isDirty: false,
      };
      set((state) => {
        if (state.tabs.some((t) => t.relativePath === relativePath)) {
          return { activePath: relativePath };
        }
        return {
          tabs: [...state.tabs, tab],
          activePath: relativePath,
        };
      });
    })();

    openFileInFlight.set(relativePath, task);
    try {
      await task;
    } finally {
      openFileInFlight.delete(relativePath);
    }
  },

  closeTab: (relativePath) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.relativePath !== relativePath);
      let activePath = state.activePath;
      if (activePath === relativePath) {
        activePath = tabs[tabs.length - 1]?.relativePath ?? null;
      }
      return { tabs, activePath };
    });
  },

  setActivePath: (relativePath) => set({ activePath: relativePath }),

  updateContent: (relativePath, content) => {
    set((state) => ({
      contentRevision: state.contentRevision + 1,
      tabs: state.tabs.map((tab) =>
        tab.relativePath === relativePath ? markDirty(tab, content) : tab,
      ),
    }));
  },

  saveFile: async (relativePath) => {
    const tab = get().tabs.find((t) => t.relativePath === relativePath);
    if (!tab) {
      return false;
    }
    try {
      const saved = await writeProjectFile(
        relativePath,
        tab.content,
        tab.modifiedMs,
      );
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.relativePath === relativePath
            ? {
                ...t,
                savedContent: t.content,
                modifiedMs: saved.modifiedMs,
                isDirty: false,
              }
            : t,
        ),
        externalConflict: null,
      }));
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      if (message.includes("modified on disk")) {
        set({ externalConflict: relativePath });
      }
      return false;
    }
  },

  saveActive: async () => {
    const active = get().activePath;
    if (!active) {
      return false;
    }
    return get().saveFile(active);
  },

  reloadFromDisk: async (relativePath) => {
    const file = await readProjectFile(relativePath);
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.relativePath === relativePath
          ? {
              ...tab,
              content: file.content,
              savedContent: file.content,
              modifiedMs: file.modifiedMs,
              isDirty: false,
            }
          : tab,
      ),
      externalConflict: null,
    }));
  },

  createFile: async (relativePath) => {
    await createProjectFile(relativePath, "");
    await get().openFile(relativePath);
  },

  renameFile: async (from, to) => {
    await renameProjectFile(from, to);
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.relativePath === from
          ? { ...tab, relativePath: to }
          : tab,
      ),
      activePath: state.activePath === from ? to : state.activePath,
    }));
  },

  deleteFile: async (relativePath) => {
    await deleteProjectFile(relativePath);
    get().closeTab(relativePath);
  },

  getOpenFileContents: () => {
    const map: Record<string, string> = {};
    for (const tab of get().tabs) {
      map[tab.relativePath] = tab.content;
    }
    return map;
  },

  resetSession: () => {
    openFileInFlight.clear();
    set({
      tabs: [],
      activePath: null,
      externalConflict: null,
      pendingEditorReveal: null,
    });
  },
}));
