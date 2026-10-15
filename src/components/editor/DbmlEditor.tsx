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
      renderLineHighlight: s.renderLineHighlight,
      cursorBlinking: s.cursorBlinking,
      bracketPairColorization: s.bracketPairColorization,
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
      theme={theme === "dark" ? "vs-dark" : "vs"}
      value={tab.content}
      onChange={onChange}
      onMount={onMount}
      options={buildMonacoEditorOptions(editorSettings)}
    />
  );
}
