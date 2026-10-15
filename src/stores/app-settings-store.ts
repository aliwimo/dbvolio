import { create } from "zustand";
import {
  type EditorSettings,
  editorSettingsDefaults,
  mergeEditorSettings,
  sanitizeEditorSettings,
} from "../features/editor/editor-settings";

interface AppSettingsState extends EditorSettings {
  parseDebounceMs: number;
  patchEditorSettings: (patch: Partial<EditorSettings>) => void;
  setParseDebounceMs: (ms: number) => void;
  resetEditorSettings: () => void;
}

const STORAGE_KEY = "dbvolio-app-settings";

const defaults = {
  ...editorSettingsDefaults,
  parseDebounceMs: 300,
};

type StoredSettings = typeof defaults;

function clampDebounce(ms: number): number {
  return Math.min(2000, Math.max(100, Math.round(ms)));
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSettings>;
      return {
        ...mergeEditorSettings(editorSettingsDefaults, parsed),
        parseDebounceMs: clampDebounce(
          parsed.parseDebounceMs ?? defaults.parseDebounceMs,
        ),
      };
    }
  } catch {
    /* ignore */
  }
  return defaults;
}

function persist(settings: StoredSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function snapshot(state: AppSettingsState): StoredSettings {
  return {
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    lineHeight: state.lineHeight,
    wordWrap: state.wordWrap,
    minimap: state.minimap,
    lineNumbers: state.lineNumbers,
    tabSize: state.tabSize,
    insertSpaces: state.insertSpaces,
    renderWhitespace: state.renderWhitespace,
    folding: state.folding,
    renderLineHighlight: state.renderLineHighlight,
    cursorBlinking: state.cursorBlinking,
    bracketPairColorization: state.bracketPairColorization,
    parseDebounceMs: state.parseDebounceMs,
  };
}

const initial = loadSettings();

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  ...initial,

  patchEditorSettings: (patch) => {
    set((state) => {
      const next = {
        ...state,
        ...sanitizeEditorSettings(patch),
      };
      persist(snapshot(next));
      return next;
    });
  },

  setParseDebounceMs: (ms) => {
    set((state) => {
      const next = { ...state, parseDebounceMs: clampDebounce(ms) };
      persist(snapshot(next));
      return next;
    });
  },

  resetEditorSettings: () => {
    set((state) => {
      const next = {
        ...state,
        ...editorSettingsDefaults,
      };
      persist(snapshot(next));
      return next;
    });
  },
}));

export type {
  EditorSettings,
  EditorWordWrap,
  EditorLineNumbers,
  EditorFontFamily,
} from "../features/editor/editor-settings";
