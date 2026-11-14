import { createStoreFactory } from "../../shared/stores/create-store";
import {
  type EditorSettings,
  editorSettingsDefaults,
  mergeEditorSettings,
  sanitizeEditorSettings,
} from "../editor/editor-settings";

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
    lineNumbers: state.lineNumbers,
    tabSize: state.tabSize,
    insertSpaces: state.insertSpaces,
    folding: state.folding,
    highlightActiveLine: state.highlightActiveLine,
    bracketMatching: state.bracketMatching,
    autocompletion: state.autocompletion,
    highlightSelectionMatches: state.highlightSelectionMatches,
    parseDebounceMs: state.parseDebounceMs,
  };
}

const initial = loadSettings();

export const useAppSettingsStore = createStoreFactory<AppSettingsState>((set) => ({
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
} from "../editor/editor-settings";
