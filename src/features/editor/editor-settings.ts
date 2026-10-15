export type EditorWordWrap = "on" | "off" | "bounded";

export type EditorLineNumbers = "on" | "off" | "relative";

export type EditorRenderWhitespace =
  | "none"
  | "boundary"
  | "selection"
  | "trailing"
  | "all";

export type EditorRenderLineHighlight = "line" | "all" | "none" | "gutter";

export type EditorCursorBlinking =
  | "blink"
  | "smooth"
  | "phase"
  | "expand"
  | "solid";

export type EditorFontFamily =
  | "system"
  | "menlo"
  | "jetbrains"
  | "fira"
  | "source-code-pro";

export interface EditorSettings {
  fontSize: number;
  fontFamily: EditorFontFamily;
  lineHeight: number;
  wordWrap: EditorWordWrap;
  minimap: boolean;
  lineNumbers: EditorLineNumbers;
  tabSize: number;
  insertSpaces: boolean;
  renderWhitespace: EditorRenderWhitespace;
  folding: boolean;
  renderLineHighlight: EditorRenderLineHighlight;
  cursorBlinking: EditorCursorBlinking;
  bracketPairColorization: boolean;
}

export const EDITOR_FONT_FAMILY_OPTIONS: {
  value: EditorFontFamily;
  label: string;
}[] = [
  { value: "system", label: "System default" },
  { value: "menlo", label: "Menlo / Monaco" },
  { value: "jetbrains", label: "JetBrains Mono" },
  { value: "fira", label: "Fira Code" },
  { value: "source-code-pro", label: "Source Code Pro" },
];

const FONT_FAMILY_CSS: Record<EditorFontFamily, string | undefined> = {
  system: undefined,
  menlo: "Menlo, Monaco, 'Courier New', monospace",
  jetbrains: "'JetBrains Mono', Menlo, Monaco, monospace",
  fira: "'Fira Code', Menlo, Monaco, monospace",
  "source-code-pro": "'Source Code Pro', Menlo, Monaco, monospace",
};

export function resolveEditorFontFamily(
  choice: EditorFontFamily,
): string | undefined {
  return FONT_FAMILY_CSS[choice];
}

export const editorSettingsDefaults: EditorSettings = {
  fontSize: 13,
  fontFamily: "system",
  lineHeight: 0,
  wordWrap: "on",
  minimap: false,
  lineNumbers: "on",
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: "selection",
  folding: true,
  renderLineHighlight: "line",
  cursorBlinking: "blink",
  bracketPairColorization: true,
};

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function sanitizeEditorSettings(
  partial: Partial<EditorSettings>,
): Partial<EditorSettings> {
  const next: Partial<EditorSettings> = {};

  if (partial.fontSize !== undefined) {
    next.fontSize = Math.min(24, Math.max(10, Math.round(partial.fontSize)));
  }
  if (
    partial.fontFamily !== undefined &&
    isOneOf(partial.fontFamily, EDITOR_FONT_FAMILY_OPTIONS.map((o) => o.value))
  ) {
    next.fontFamily = partial.fontFamily;
  }
  if (partial.lineHeight !== undefined) {
    next.lineHeight = Math.min(40, Math.max(0, Math.round(partial.lineHeight)));
  }
  if (
    partial.wordWrap !== undefined &&
    isOneOf(partial.wordWrap, ["on", "off", "bounded"] as const)
  ) {
    next.wordWrap = partial.wordWrap;
  }
  if (partial.minimap !== undefined) {
    next.minimap = Boolean(partial.minimap);
  }
  if (
    partial.lineNumbers !== undefined &&
    isOneOf(partial.lineNumbers, ["on", "off", "relative"] as const)
  ) {
    next.lineNumbers = partial.lineNumbers;
  }
  if (partial.tabSize !== undefined) {
    next.tabSize = Math.min(8, Math.max(2, Math.round(partial.tabSize)));
  }
  if (partial.insertSpaces !== undefined) {
    next.insertSpaces = Boolean(partial.insertSpaces);
  }
  if (
    partial.renderWhitespace !== undefined &&
    isOneOf(partial.renderWhitespace, [
      "none",
      "boundary",
      "selection",
      "trailing",
      "all",
    ] as const)
  ) {
    next.renderWhitespace = partial.renderWhitespace;
  }
  if (partial.folding !== undefined) {
    next.folding = Boolean(partial.folding);
  }
  if (
    partial.renderLineHighlight !== undefined &&
    isOneOf(partial.renderLineHighlight, [
      "line",
      "all",
      "none",
      "gutter",
    ] as const)
  ) {
    next.renderLineHighlight = partial.renderLineHighlight;
  }
  if (
    partial.cursorBlinking !== undefined &&
    isOneOf(partial.cursorBlinking, [
      "blink",
      "smooth",
      "phase",
      "expand",
      "solid",
    ] as const)
  ) {
    next.cursorBlinking = partial.cursorBlinking;
  }
  if (partial.bracketPairColorization !== undefined) {
    next.bracketPairColorization = Boolean(partial.bracketPairColorization);
  }

  return next;
}

export function mergeEditorSettings(
  base: EditorSettings,
  partial: Partial<EditorSettings>,
): EditorSettings {
  return { ...base, ...sanitizeEditorSettings(partial) };
}

export function buildMonacoEditorOptions(settings: EditorSettings) {
  const fontFamily = resolveEditorFontFamily(settings.fontFamily);

  return {
    minimap: { enabled: settings.minimap },
    fontSize: settings.fontSize,
    ...(fontFamily ? { fontFamily } : {}),
    lineHeight: settings.lineHeight,
    wordWrap: settings.wordWrap,
    lineNumbers: settings.lineNumbers,
    tabSize: settings.tabSize,
    insertSpaces: settings.insertSpaces,
    renderWhitespace: settings.renderWhitespace,
    folding: settings.folding,
    renderLineHighlight: settings.renderLineHighlight,
    cursorBlinking: settings.cursorBlinking,
    bracketPairColorization: {
      enabled: settings.bracketPairColorization,
    },
    scrollBeyondLastLine: false,
    automaticLayout: true,
  };
}
