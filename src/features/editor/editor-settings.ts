export type EditorWordWrap = "on" | "off";

export type EditorLineNumbers = "on" | "off";

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
  lineNumbers: EditorLineNumbers;
  tabSize: number;
  insertSpaces: boolean;
  folding: boolean;
  highlightActiveLine: boolean;
  bracketMatching: boolean;
  autocompletion: boolean;
  highlightSelectionMatches: boolean;
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
  jetbrains:
    "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
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
  fontFamily: "jetbrains",
  lineHeight: 22,
  wordWrap: "on",
  lineNumbers: "on",
  tabSize: 2,
  insertSpaces: true,
  folding: true,
  highlightActiveLine: true,
  bracketMatching: true,
  autocompletion: true,
  highlightSelectionMatches: true,
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

  if (partial.fontSize !== undefined && Number.isFinite(partial.fontSize)) {
    next.fontSize = Math.min(24, Math.max(10, Math.round(partial.fontSize)));
  }
  if (
    partial.fontFamily !== undefined &&
    isOneOf(partial.fontFamily, EDITOR_FONT_FAMILY_OPTIONS.map((o) => o.value))
  ) {
    next.fontFamily = partial.fontFamily;
  }
  if (partial.lineHeight !== undefined && Number.isFinite(partial.lineHeight)) {
    next.lineHeight = Math.min(40, Math.max(0, Math.round(partial.lineHeight)));
  }
  if (
    partial.wordWrap !== undefined &&
    isOneOf(partial.wordWrap, ["on", "off"] as const)
  ) {
    next.wordWrap = partial.wordWrap;
  }
  if (
    partial.lineNumbers !== undefined &&
    isOneOf(partial.lineNumbers, ["on", "off"] as const)
  ) {
    next.lineNumbers = partial.lineNumbers;
  }
  if (partial.tabSize !== undefined && Number.isFinite(partial.tabSize)) {
    next.tabSize = Math.min(8, Math.max(2, Math.round(partial.tabSize)));
  }
  if (partial.insertSpaces !== undefined) {
    next.insertSpaces = Boolean(partial.insertSpaces);
  }
  if (partial.folding !== undefined) {
    next.folding = Boolean(partial.folding);
  }
  if (partial.highlightActiveLine !== undefined) {
    next.highlightActiveLine = Boolean(partial.highlightActiveLine);
  }
  if (partial.bracketMatching !== undefined) {
    next.bracketMatching = Boolean(partial.bracketMatching);
  }
  if (partial.autocompletion !== undefined) {
    next.autocompletion = Boolean(partial.autocompletion);
  }
  if (partial.highlightSelectionMatches !== undefined) {
    next.highlightSelectionMatches = Boolean(partial.highlightSelectionMatches);
  }

  return next;
}

export function mergeEditorSettings(
  base: EditorSettings,
  partial: Partial<EditorSettings>,
): EditorSettings {
  return { ...base, ...sanitizeEditorSettings(partial) };
}
