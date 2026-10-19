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
    foldingHighlight: state.foldingHighlight,
    renderLineHighlight: state.renderLineHighlight,
    renderLineHighlightOnlyWhenFocus: state.renderLineHighlightOnlyWhenFocus,
    cursorBlinking: state.cursorBlinking,
    cursorSmoothCaretAnimation: state.cursorSmoothCaretAnimation,
    bracketPairColorization: state.bracketPairColorization,
    fontLigatures: state.fontLigatures,
    smoothScrolling: state.smoothScrolling,
    overviewRulerBorder: state.overviewRulerBorder,
    hideCursorInOverviewRuler: state.hideCursorInOverviewRuler,
    contextmenu: state.contextmenu,
    glyphMargin: state.glyphMargin,
    lightbulb: state.lightbulb,
    occurrencesHighlight: state.occurrencesHighlight,
    selectionHighlight: state.selectionHighlight,
    stickyScroll: state.stickyScroll,
    indentationGuides: state.indentationGuides,
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
