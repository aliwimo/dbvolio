import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/editor/editor.worker?worker";
import { dbmlMonarchTokensProvider } from "@dbml/core";
import { createEffect, onCleanup, Show } from "solid-js";
import { useDiagramStore } from "../diagram/diagram-store";
import { useEditorStore } from "./editor-store";
import { useProjectStore } from "../projects/project-store";
import { buildMonacoEditorOptions } from "./editor-settings";
import { useAppSettingsStore } from "../settings/app-settings-store";
import { useUiStore } from "../../shared/stores/ui-store";

let monacoConfigured = false;
function ensureMonacoConfigured() {
  if (monacoConfigured) return;
  monacoConfigured = true;

  (globalThis as any).MonacoEnvironment = {
    getWorker(_: unknown, _label: string) {
      return new editorWorker();
    },
  };

  if (
    !monaco.languages
      .getLanguages()
      .some((lang: { id: string }) => lang.id === "dbml")
  ) {
    monaco.languages.register({ id: "dbml" });
    monaco.languages.setMonarchTokensProvider(
      "dbml",
      dbmlMonarchTokensProvider as any
    );
  }

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
      "editorCursor.foreground": "#f4f4f5",
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
      "editorCursor.foreground": "#111111",
      "editor.lineHighlightBackground": "#f8f9fc",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#dbeafe",
      "editor.inactiveSelectionBackground": "#eef2f6",
      "editorIndentGuide.background": "#e8e8ec",
      "editorIndentGuide.activeBackground": "#c8c8cf",
      "editorGutter.background": "#ffffff",
      "editorOverviewRuler.border": "#00000000",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#e4e4e7",
      "input.background": "#ffffff",
      "input.border": "#d4d4d8",
      "scrollbarSlider.background": "#00000010",
      "scrollbarSlider.hoverBackground": "#00000020",
      "scrollbarSlider.activeBackground": "#00000030",
    },
  });
}

export function DbmlEditor() {
  ensureMonacoConfigured();

  let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
  let isUpdatingModel = false;

  const activePath = () => useEditorStore((s) => s.activePath);
  const activeTab = () =>
    useEditorStore((s) => s.tabs.find((t) => t.relativePath === s.activePath));
  const diagnostics = () => useDiagramStore((s) => s.diagnostics);
  const theme = () => useUiStore((s) => s.theme);
  const editorSettings = () => useAppSettingsStore((s) => s);
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const pendingEditorReveal = () => useEditorStore((s) => s.pendingEditorReveal);

  const initOrUpdateEditor = (el: HTMLDivElement) => {
    if (editorInstance) return;

    editorInstance = monaco.editor.create(el, {
      language: "dbml",
      theme: theme() === "dark" ? "dbvolio-dark" : "dbvolio-light",
      automaticLayout: true,
      value: activeTab()?.content ?? "",
      ...buildMonacoEditorOptions(editorSettings()),
    });

    editorInstance.onDidChangeModelContent(() => {
      if (isUpdatingModel) return;
      const currentPath = activePath();
      if (!currentPath || !editorInstance) return;
      const val = editorInstance.getValue();
      useEditorStore.getState().updateContent(currentPath, val);
    });

    const pending = useEditorStore.getState().pendingEditorReveal;
    const currentPath = useEditorStore.getState().activePath;
    if (pending && currentPath === pending.relativePath) {
      requestAnimationFrame(() => {
        if (!editorInstance) return;
        editorInstance.revealLineInCenter(pending.line);
        editorInstance.setPosition({ lineNumber: pending.line, column: 1 });
        useEditorStore.getState().clearEditorReveal();
      });
    }
  };

  onCleanup(() => {
    editorInstance?.dispose();
    editorInstance = null;
  });

  // Sync content when active tab or active path changes
  createEffect(() => {
    const tab = activeTab();
    if (!editorInstance) return;

    isUpdatingModel = true;
    const currentVal = editorInstance.getValue();
    const targetVal = tab?.content ?? "";
    if (currentVal !== targetVal) {
      editorInstance.setValue(targetVal);
    }
    isUpdatingModel = false;
  });

  // Update theme
  createEffect(() => {
    const t = theme();
    monaco.editor.setTheme(t === "dark" ? "dbvolio-dark" : "dbvolio-light");
  });

  // Update settings
  createEffect(() => {
    if (!editorInstance) return;
    editorInstance.updateOptions(buildMonacoEditorOptions(editorSettings()));
  });

  // Update diagnostics markers
  createEffect(() => {
    if (!editorInstance) return;
    const model = editorInstance.getModel();
    if (!model) return;

    const currentPath = activePath();
    const fileDiags = diagnostics().filter(
      (d) => !d.filepath || d.filepath === currentPath
    );

    const markers: monaco.editor.IMarkerData[] = fileDiags.map((d) => ({
      message: d.message,
      severity:
        d.severity === "error"
          ? monaco.MarkerSeverity.Error
          : d.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      startLineNumber: d.line ?? 1,
      startColumn: d.column ?? 1,
      endLineNumber: d.endLine ?? d.line ?? 1,
      endColumn: d.endColumn ?? (d.column ?? 1) + 10,
    }));

    monaco.editor.setModelMarkers(model, "dbml", markers);
  });

  // Handle pending editor reveals
  createEffect(() => {
    const pending = pendingEditorReveal();
    const currentPath = activePath();
    if (!pending || !editorInstance || currentPath !== pending.relativePath) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      if (!editorInstance) return;
      editorInstance.revealLineInCenter(pending.line);
      editorInstance.setPosition({ lineNumber: pending.line, column: 1 });
      useEditorStore.getState().clearEditorReveal();
    });
    onCleanup(() => cancelAnimationFrame(handle));
  });

  return (
    <div class="dbml-editor-wrap" style={{ width: "100%", height: "100%", position: "relative" }}>
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
        <div ref={initOrUpdateEditor} style={{ width: "100%", height: "100%" }} />
      </Show>
    </div>
  );
}
