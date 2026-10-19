import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { dbmlMonarchTokensProvider } from "@dbml/core";
import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDiagramStore } from "../../stores/diagram-store";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { buildMonacoEditorOptions } from "../../features/editor/editor-settings";
import { useAppSettingsStore } from "../../stores/app-settings-store";
import { useUiStore } from "../../stores/ui-store";

loader.init().then((monaco) => {
  if (
    !monaco.languages
      .getLanguages()
      .some((lang: { id: string }) => lang.id === "dbml")
  ) {
    monaco.languages.register({ id: "dbml" });
    monaco.languages.setMonarchTokensProvider(
      "dbml",
      dbmlMonarchTokensProvider,
    );
  }

  // Theme matching Dbvolio Dark (#18181b panel, #121214 app, #8d8d96 muted, #8eb0f0 accent)
  monaco.editor.defineTheme("dbvolio-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "8eb0f0", fontStyle: "bold" },
      { token: "type", foreground: "5dbe86" },
      { token: "string", foreground: "e5c07b" },
      { token: "comment", foreground: "63636e", fontStyle: "italic" },
      { token: "number", foreground: "f07171" },
      { token: "delimiter", foreground: "8d8d96" },
    ],
    colors: {
      "editor.background": "#18181b",
      "editor.foreground": "#ececef",
      "editorLineNumber.foreground": "#4e4e56",
      "editorLineNumber.activeForeground": "#ececef",
      "editorCursor.foreground": "#8eb0f0",
      "editor.lineHighlightBackground": "#202024",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#333b4d",
      "editor.inactiveSelectionBackground": "#282d3b",
      "editorIndentGuide.background": "#27272b",
      "editorIndentGuide.activeBackground": "#3d3d45",
      "editorGutter.background": "#18181b",
      "editorOverviewRuler.border": "#00000000",
      "editorWidget.background": "#1c1c1f",
      "editorWidget.border": "#2a2a2e",
      "input.background": "#121214",
      "input.border": "#2a2a2e",
      "scrollbarSlider.background": "#ffffff12",
      "scrollbarSlider.hoverBackground": "#ffffff22",
      "scrollbarSlider.activeBackground": "#ffffff33",
    },
  });

  // Theme matching Dbvolio Light (#ffffff panel, #f7f7f8 app, #73737c muted, #3b6fd4 accent)
  monaco.editor.defineTheme("dbvolio-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "2f5cb8", fontStyle: "bold" },
      { token: "type", foreground: "1f8a4c" },
      { token: "string", foreground: "a16207" },
      { token: "comment", foreground: "8e8e98", fontStyle: "italic" },
      { token: "number", foreground: "d14343" },
      { token: "delimiter", foreground: "73737c" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1c1c1f",
      "editorLineNumber.foreground": "#b5b5bc",
      "editorLineNumber.activeForeground": "#1c1c1f",
      "editorCursor.foreground": "#3b6fd4",
      "editor.lineHighlightBackground": "#f8f9fc",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#dbe8fc",
      "editor.inactiveSelectionBackground": "#ebf1fa",
      "editorIndentGuide.background": "#efeff2",
      "editorIndentGuide.activeBackground": "#d8d8de",
      "editorGutter.background": "#ffffff",
      "editorOverviewRuler.border": "#00000000",
      "editorWidget.background": "#f7f7f8",
      "editorWidget.border": "#ececee",
      "input.background": "#ffffff",
      "input.border": "#dcdce1",
      "scrollbarSlider.background": "#00000010",
      "scrollbarSlider.hoverBackground": "#00000020",
      "scrollbarSlider.activeBackground": "#00000030",
    },
  });
});

export function DbmlEditor() {
  const activePath = useEditorStore((s) => s.activePath);
  const tab = useEditorStore((s) =>
    s.tabs.find((t) => t.relativePath === s.activePath),
  );
  const updateContent = useEditorStore((s) => s.updateContent);
  const pendingEditorReveal = useEditorStore((s) => s.pendingEditorReveal);
  const clearEditorReveal = useEditorStore((s) => s.clearEditorReveal);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const theme = useUiStore((s) => s.theme);
  const editorSettings = useAppSettingsStore(
    useShallow((s) => ({
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      lineHeight: s.lineHeight,
      wordWrap: s.wordWrap,
      minimap: s.minimap,
      lineNumbers: s.lineNumbers,
      tabSize: s.tabSize,
      insertSpaces: s.insertSpaces,
      renderWhitespace: s.renderWhitespace,
      folding: s.folding,
      foldingHighlight: s.foldingHighlight,
      renderLineHighlight: s.renderLineHighlight,
      renderLineHighlightOnlyWhenFocus: s.renderLineHighlightOnlyWhenFocus,
      cursorBlinking: s.cursorBlinking,
      cursorSmoothCaretAnimation: s.cursorSmoothCaretAnimation,
      bracketPairColorization: s.bracketPairColorization,
      fontLigatures: s.fontLigatures,
      smoothScrolling: s.smoothScrolling,
      overviewRulerBorder: s.overviewRulerBorder,
      hideCursorInOverviewRuler: s.hideCursorInOverviewRuler,
      contextmenu: s.contextmenu,
      glyphMargin: s.glyphMargin,
      lightbulb: s.lightbulb,
      occurrencesHighlight: s.occurrencesHighlight,
      selectionHighlight: s.selectionHighlight,
      stickyScroll: s.stickyScroll,
      indentationGuides: s.indentationGuides,
    })),
  );
  const diagnostics = useDiagramStore((s) => s.diagnostics);
  const monacoRef = useRef<Awaited<ReturnType<typeof loader.init>> | null>(
    null,
  );
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const onChange = useCallback(
    (value: string | undefined) => {
      if (activePath && value !== undefined) {
        updateContent(activePath, value);
      }
    },
    [activePath, updateContent],
  );

  const applyEditorReveal = useCallback(
    (relativePath: string, line: number) => {
      const editor = editorRef.current;
      if (!editor || activePath !== relativePath) {
        return false;
      }
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
      return true;
    },
    [activePath],
  );

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    const pending = useEditorStore.getState().pendingEditorReveal;
    const currentPath = useEditorStore.getState().activePath;
    if (pending && currentPath === pending.relativePath) {
      requestAnimationFrame(() => {
        editor.revealLineInCenter(pending.line);
        editor.setPosition({ lineNumber: pending.line, column: 1 });
        editor.focus();
        useEditorStore.getState().clearEditorReveal();
      });
    }
  };

  useEffect(() => {
    if (!pendingEditorReveal || activePath !== pendingEditorReveal.relativePath) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      if (
        applyEditorReveal(
          pendingEditorReveal.relativePath,
          pendingEditorReveal.line,
        )
      ) {
        clearEditorReveal();
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [
    pendingEditorReveal,
    activePath,
    tab?.content,
    applyEditorReveal,
    clearEditorReveal,
  ]);

  useEffect(() => {
    const monacoEditor = editorRef.current;
    const monaco = monacoRef.current;
    if (!monacoEditor || !monaco || !activePath || !projectRoot) {
      return;
    }
    const model = monacoEditor.getModel();
    if (!model) {
      return;
    }
    const fileDiags = diagnostics.filter(
      (d) => !d.filepath || d.filepath === activePath,
    );
    const markers = fileDiags.map((d) => ({
      severity:
        d.severity === "error"
          ? monaco.MarkerSeverity.Error
          : d.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      message: d.message,
      startLineNumber: d.line,
      startColumn: d.column,
      endLineNumber: d.endLine ?? d.line,
      endColumn: d.endColumn ?? d.column + 1,
    }));
    monaco.editor.setModelMarkers(model, "dbml", markers);
  }, [diagnostics, activePath, projectRoot]);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) {
      monaco.editor.setTheme(theme === "dark" ? "dbvolio-dark" : "dbvolio-light");
    }
  }, [theme]);

  if (!projectRoot) {
    return (
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: "var(--text-muted)",
        }}
      >
        Open a project to edit DBML files.
      </div>
    );
  }

  if (!tab) {
    return (
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: "var(--text-muted)",
        }}
      >
        Select a file from the explorer.
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language="dbml"
      theme={theme === "dark" ? "dbvolio-dark" : "dbvolio-light"}
      value={tab.content}
      onChange={onChange}
      onMount={onMount}
      options={buildMonacoEditorOptions(editorSettings)}
    />
  );
}
