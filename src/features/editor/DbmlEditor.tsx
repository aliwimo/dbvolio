import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from "@codemirror/view";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  StreamLanguage,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  foldGutter,
  indentUnit,
  indentOnInput,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type CompletionContext,
} from "@codemirror/autocomplete";
import {
  highlightSelectionMatches,
  searchKeymap,
} from "@codemirror/search";
import { setDiagnostics, lintGutter, type Diagnostic } from "@codemirror/lint";
import { tags } from "@lezer/highlight";
import { useEditorStore } from "./editor-store";
import { useDiagramStore } from "../diagram/diagram-store";
import { useUiStore } from "../../shared/stores/ui-store";
import { useAppSettingsStore } from "../settings/app-settings-store";
import { useProjectStore } from "../projects/project-store";
import { resolveEditorFontFamily, type EditorSettings } from "./editor-settings";

const DBML_KEYWORDS = new Set([
  "Project",
  "Table",
  "TableGroup",
  "Enum",
  "Ref",
  "Note",
  "indexes",
  "Indexes",
  "primary",
  "key",
  "pk",
  "unique",
  "not",
  "null",
  "increment",
  "default",
  "note",
  "ref",
  "delete",
  "update",
  "cascade",
  "restrict",
  "set",
  "no",
  "action",
  "as",
  "headercolor",
]);

const DBML_DECL_KEYWORDS = new Set([
  "Project",
  "Table",
  "TableGroup",
  "Enum",
  "Ref",
]);

const DBML_TYPES = new Set([
  "int",
  "integer",
  "bigint",
  "smallint",
  "tinyint",
  "serial",
  "bigserial",
  "varchar",
  "char",
  "text",
  "boolean",
  "bool",
  "timestamp",
  "timestamptz",
  "datetime",
  "date",
  "time",
  "decimal",
  "numeric",
  "float",
  "double",
  "real",
  "json",
  "jsonb",
  "uuid",
  "bytea",
  "blob",
]);

interface DbmlStreamState {
  inBlockComment: boolean;
  inTripleQuote: boolean;
  expectDeclName: boolean;
}

const dbmlLanguage = StreamLanguage.define<DbmlStreamState>({
  startState: () => ({
    inBlockComment: false,
    inTripleQuote: false,
    expectDeclName: false,
  }),
  token(stream, state) {
    if (state.inBlockComment) {
      if (stream.match("*/")) {
        state.inBlockComment = false;
        return "comment";
      }
      stream.next();
      return "comment";
    }

    if (state.inTripleQuote) {
      if (stream.match("'''")) {
        state.inTripleQuote = false;
        return "string";
      }
      stream.next();
      return "string";
    }

    if (stream.eatSpace()) return null;

    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match("/*")) {
      state.inBlockComment = true;
      return "comment";
    }

    if (stream.match("'''")) {
      state.inTripleQuote = true;
      return "string";
    }

    if (stream.match(/^'(?:[^'\\]|\\.)*'/)) return "string";
    if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return "string";
    if (stream.match(/^`(?:[^`\\]|\\.)*`/)) return "string";

    if (stream.match(/^[{}()[\]]/)) {
      state.expectDeclName = false;
      return "bracket";
    }

    if (stream.match(/^[:,.]/)) return "punctuation";

    if (stream.match(/^(?:<>|->|<-|[<>-])/)) {
      return "operator";
    }

    if (stream.match(/^\d+(?:\.\d+)?/)) return "number";

    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current();
      if (state.expectDeclName) {
        state.expectDeclName = false;
        return "className";
      }
      if (DBML_DECL_KEYWORDS.has(word)) {
        state.expectDeclName = true;
        return "keyword";
      }
      if (DBML_KEYWORDS.has(word)) return "keyword";
      if (DBML_TYPES.has(word)) return "typeName";
      return "variableName";
    }

    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
    closeBrackets: { brackets: ["(", "[", "{", "'", '"', "`"] },
  },
});

const darkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#a5b4fc", fontWeight: "600" },
  { tag: tags.className, color: "#f9a8d4", fontWeight: "600" },
  { tag: tags.typeName, color: "#6ee7b7" },
  { tag: tags.string, color: "#fde68a" },
  { tag: tags.number, color: "#fca5a5" },
  { tag: tags.comment, color: "#64748b", fontStyle: "italic" },
  { tag: tags.operator, color: "#c4b5fd", fontWeight: "600" },
  { tag: tags.bracket, color: "#94a3b8" },
  { tag: tags.punctuation, color: "#64748b" },
  { tag: tags.variableName, color: "#e2e8f0" },
]);

const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#4f46e5", fontWeight: "600" },
  { tag: tags.className, color: "#db2777", fontWeight: "600" },
  { tag: tags.typeName, color: "#059669" },
  { tag: tags.string, color: "#b45309" },
  { tag: tags.number, color: "#dc2626" },
  { tag: tags.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: tags.operator, color: "#7c3aed", fontWeight: "600" },
  { tag: tags.bracket, color: "#64748b" },
  { tag: tags.punctuation, color: "#94a3b8" },
  { tag: tags.variableName, color: "#0f172a" },
]);

function buildThemeExtension(isDark: boolean): Extension {
  const baseTheme = EditorView.theme(
    {
      "&": {
        height: "100%",
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        color: isDark ? "#ececef" : "#1c1c1f",
      },
      ".cm-scroller": {
        overflow: "auto",
        paddingTop: "14px",
        paddingBottom: "14px",
      },
      ".cm-gutters": {
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        color: isDark ? "#52525b" : "#a1a1aa",
        borderRight: "none",
      },
      ".cm-activeLine": {
        backgroundColor: isDark
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(24, 24, 27, 0.04)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDark ? "#1c1c1f" : "#f7f7f8",
        color: isDark ? "#ececef" : "#1c1c1f",
      },
      ".cm-cursor": {
        borderLeftColor: isDark ? "#f4f4f5" : "#111111",
      },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: isDark
          ? "rgba(165, 180, 252, 0.25) !important"
          : "rgba(79, 70, 229, 0.18) !important",
      },
      ".cm-matchingBracket": {
        backgroundColor: isDark
          ? "rgba(244, 244, 245, 0.14)"
          : "rgba(24, 24, 27, 0.1)",
        outline: isDark
          ? "1px solid rgba(244, 244, 245, 0.25)"
          : "1px solid rgba(24, 24, 27, 0.2)",
      },
      ".cm-tooltip": {
        backgroundColor: isDark ? "#1c1c1f" : "#ffffff",
        border: isDark ? "1px solid #2a2a2e" : "1px solid #dcdce1",
        color: isDark ? "#ececef" : "#1c1c1f",
        borderRadius: "6px",
        boxShadow: isDark
          ? "0 12px 32px rgba(0, 0, 0, 0.4)"
          : "0 12px 32px rgba(24, 24, 27, 0.1)",
      },
      ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: isDark ? "#242428" : "#f1f1f3",
        color: isDark ? "#ffffff" : "#111111",
      },
    },
    { dark: isDark }
  );

  return [
    baseTheme,
    syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
  ];
}

function buildSettingsExtensions(settings: EditorSettings): Extension[] {
  const fontFamily = resolveEditorFontFamily(settings.fontFamily);
  const exts: Extension[] = [
    EditorView.theme({
      "&": {
        fontSize: `${settings.fontSize}px`,
        ...(fontFamily ? { fontFamily } : {}),
      },
      ".cm-content": {
        lineHeight: `${settings.lineHeight || 22}px`,
        ...(fontFamily ? { fontFamily } : {}),
      },
      ".cm-gutters": {
        ...(fontFamily ? { fontFamily } : {}),
      },
    }),
    EditorState.tabSize.of(settings.tabSize),
    indentUnit.of(settings.insertSpaces ? " ".repeat(settings.tabSize) : "\t"),
  ];

  if (settings.wordWrap !== "off") {
    exts.push(EditorView.lineWrapping);
  }
  if (settings.lineNumbers !== "off") {
    exts.push(lineNumbers());
  }
  if (settings.folding) {
    exts.push(foldGutter());
  }
  if (settings.highlightActiveLine) {
    exts.push(highlightActiveLine(), highlightActiveLineGutter());
  }
  if (settings.bracketMatching) {
    exts.push(bracketMatching());
  }
  if (settings.autocompletion) {
    exts.push(autocompletion({ override: [dbmlCompletionSource] }));
  }
  if (settings.highlightSelectionMatches) {
    exts.push(highlightSelectionMatches());
  }

  return exts;
}

const DBML_COMPLETIONS = [
  ...Array.from(DBML_KEYWORDS).map((label) => ({ label, type: "keyword" })),
  ...Array.from(DBML_TYPES).map((label) => ({ label, type: "type" })),
];

function dbmlCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: DBML_COMPLETIONS,
  };
}

function lineColToOffset(doc: EditorState["doc"], line: number, col: number): number {
  const clampedLine = Math.max(1, Math.min(line, doc.lines));
  const lineInfo = doc.line(clampedLine);
  const clampedCol = Math.max(1, Math.min(col, lineInfo.length + 1));
  return lineInfo.from + clampedCol - 1;
}

export function DbmlEditor() {
  let editorView: EditorView | null = null;
  let isUpdatingDoc = false;

  const [cursorPos, setCursorPos] = createSignal({ line: 1, col: 1, selected: 0 });

  const themeCompartment = new Compartment();
  const settingsCompartment = new Compartment();

  const activePath = () => useEditorStore((s) => s.activePath);
  const activeTab = () =>
    useEditorStore((s) => s.tabs.find((t) => t.relativePath === s.activePath));
  const diagnostics = () => useDiagramStore((s) => s.diagnostics);
  const theme = () => useUiStore((s) => s.theme);
  const editorSettings = () => useAppSettingsStore((s) => s);
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const pendingEditorReveal = () => useEditorStore((s) => s.pendingEditorReveal);

  const revealLine = (view: EditorView, line: number) => {
    const clampedLine = Math.max(1, Math.min(line, view.state.doc.lines));
    const pos = view.state.doc.line(clampedLine).from;
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
  };

  const initOrUpdateEditor = (el: HTMLDivElement) => {
    if (editorView) return;

    const state = EditorState.create({
      doc: activeTab()?.content ?? "",
      extensions: [
        history(),
        drawSelection(),
        indentOnInput(),
        closeBrackets(),
        lintGutter(),
        dbmlLanguage,
        keymap.of([
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        themeCompartment.of(buildThemeExtension(theme() === "dark")),
        settingsCompartment.of(buildSettingsExtensions(editorSettings())),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            const sel = update.state.selection.main;
            const lineInfo = update.state.doc.lineAt(sel.head);
            setCursorPos({
              line: lineInfo.number,
              col: sel.head - lineInfo.from + 1,
              selected: Math.abs(sel.to - sel.from),
            });
          }
          if (!update.docChanged || isUpdatingDoc) return;
          const currentPath = activePath();
          if (!currentPath) return;
          useEditorStore
            .getState()
            .updateContent(currentPath, update.state.doc.toString());
        }),
      ],
    });

    editorView = new EditorView({ state, parent: el });

    const pending = useEditorStore.getState().pendingEditorReveal;
    const currentPath = useEditorStore.getState().activePath;
    if (pending && currentPath === pending.relativePath) {
      requestAnimationFrame(() => {
        if (!editorView) return;
        revealLine(editorView, pending.line);
        useEditorStore.getState().clearEditorReveal();
      });
    }
  };

  onCleanup(() => {
    editorView?.destroy();
    editorView = null;
  });

  // Sync content when active tab or active path changes
  createEffect(() => {
    const tab = activeTab();
    if (!editorView) return;

    const currentVal = editorView.state.doc.toString();
    const targetVal = tab?.content ?? "";
    if (currentVal !== targetVal) {
      isUpdatingDoc = true;
      editorView.dispatch({
        changes: { from: 0, to: currentVal.length, insert: targetVal },
      });
      isUpdatingDoc = false;
    }
  });

  // Update theme
  createEffect(() => {
    const isDark = theme() === "dark";
    if (!editorView) return;
    editorView.dispatch({
      effects: themeCompartment.reconfigure(buildThemeExtension(isDark)),
    });
  });

  // Update settings
  createEffect(() => {
    const settings = editorSettings();
    if (!editorView) return;
    editorView.dispatch({
      effects: settingsCompartment.reconfigure(buildSettingsExtensions(settings)),
    });
  });

  // Update diagnostics markers
  createEffect(() => {
    if (!editorView) return;

    const currentPath = activePath();
    const fileDiags = diagnostics().filter(
      (d) => !d.filepath || d.filepath === currentPath
    );

    const doc = editorView.state.doc;
    const markers: Diagnostic[] = fileDiags.map((d) => {
      const from = lineColToOffset(doc, d.line ?? 1, d.column ?? 1);
      const to = Math.max(
        from,
        lineColToOffset(doc, d.endLine ?? d.line ?? 1, d.endColumn ?? (d.column ?? 1) + 10)
      );
      return {
        from,
        to,
        severity:
          d.severity === "error"
            ? "error"
            : d.severity === "warning"
              ? "warning"
              : "info",
        message: d.message,
      };
    });

    editorView.dispatch(setDiagnostics(editorView.state, markers));
  });

  // Handle pending editor reveals
  createEffect(() => {
    const pending = pendingEditorReveal();
    const currentPath = activePath();
    if (!pending || !editorView || currentPath !== pending.relativePath) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      if (!editorView) return;
      revealLine(editorView, pending.line);
      useEditorStore.getState().clearEditorReveal();
    });
    onCleanup(() => cancelAnimationFrame(handle));
  });

  const fileDiagCounts = () => {
    const currentPath = activePath();
    const fileDiags = diagnostics().filter(
      (d) => !d.filepath || d.filepath === currentPath
    );
    let errors = 0;
    let warnings = 0;
    for (const d of fileDiags) {
      if (d.severity === "error") errors++;
      else if (d.severity === "warning") warnings++;
    }
    return { errors, warnings };
  };

  return (
    <div
      class="dbml-editor-wrap"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <Show
        when={activePath()}
        fallback={
          <div class="dbml-editor-empty">
            <p>
              {projectRoot()
                ? "Select a file from the explorer to edit."
                : "Open a folder or DBML file to get started."}
            </p>
          </div>
        }
      >
        <div
          ref={initOrUpdateEditor}
          style={{ flex: "1", "min-height": "0", width: "100%", overflow: "hidden" }}
        />
        <div
          class="dbml-editor-statusbar"
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "space-between",
            padding: "2px 10px",
            "font-size": "11px",
            "line-height": "18px",
            "border-top": "1px solid var(--border, rgba(128,128,128,0.2))",
            color: "var(--muted-foreground, #888)",
            "user-select": "none",
            "flex-shrink": "0",
          }}
        >
          <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
            <span>
              Ln {cursorPos().line}, Col {cursorPos().col}
              {cursorPos().selected > 0 ? ` (${cursorPos().selected} selected)` : ""}
            </span>
            <Show when={fileDiagCounts().errors > 0 || fileDiagCounts().warnings > 0}>
              <span
                style={{
                  color:
                    fileDiagCounts().errors > 0
                      ? "var(--destructive, #e5484d)"
                      : "var(--warning, #f5a623)",
                }}
              >
                {fileDiagCounts().errors > 0
                  ? `${fileDiagCounts().errors} error${fileDiagCounts().errors === 1 ? "" : "s"}`
                  : ""}
                {fileDiagCounts().errors > 0 && fileDiagCounts().warnings > 0 ? ", " : ""}
                {fileDiagCounts().warnings > 0
                  ? `${fileDiagCounts().warnings} warning${fileDiagCounts().warnings === 1 ? "" : "s"}`
                  : ""}
              </span>
            </Show>
          </div>
          <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
            <span>
              {editorSettings().insertSpaces ? "Spaces" : "Tabs"}: {editorSettings().tabSize}
            </span>
            <span>DBML</span>
          </div>
        </div>
      </Show>
    </div>
  );
}
