import { FileText, FolderOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectExplorer } from "../components/explorer/ProjectExplorer";
import { DbmlEditor } from "../components/editor/DbmlEditor";
import { EditorTabs } from "../components/editor/EditorTabs";
import { SchemaDiagram } from "../components/diagram/SchemaDiagram";
import { SchemaInspector } from "../components/inspector/SchemaInspector";
import { TableEditModal } from "../components/inspector/TableEditModal";
import { Header } from "../components/layout/Header";
import { SplitPane } from "../components/layout/SplitPane";
import { StatusBar } from "../components/layout/StatusBar";
import { AppSettings } from "../components/settings/AppSettings";
import { useRevealTableInEditor } from "../features/editor/useRevealTableInEditor";
import { useDebouncedParse } from "../features/parsing/useDebouncedParse";
import { useEditorStore } from "../stores/editor-store";
import { useProjectStore } from "../stores/project-store";
import { useExternalDbmlOpen } from "../features/open/useExternalDbmlOpen";
import { useAppKeymap } from "../features/keymap/use-app-keymap";
import { useNativeAppMenu } from "../features/keymap/use-native-app-menu";
import {
  DEFAULT_INSPECTOR_WIDTH,
  useUiStore,
} from "../stores/ui-store";

function EditorPanel() {
  return (
    <div className="panel panel-fill panel-flush">
      <EditorTabs />
      <div className="panel-content">
        <DbmlEditor />
      </div>
    </div>
  );
}

function Welcome() {
  const openProjectDialog = useProjectStore((s) => s.openProjectDialog);
  const openDbmlFileDialog = useProjectStore((s) => s.openDbmlFileDialog);

  const openWithError = (action: () => Promise<void>) => {
    void action().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(message);
    });
  };

  return (
    <div className="welcome">
      <p className="welcome-title">Open a project</p>
      <p className="empty-hint">
        Open a folder or a single <code>.dbml</code> file, or double-click a
        file in Finder to start here.
      </p>
      <div className="welcome-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => openWithError(openProjectDialog)}
        >
          <FolderOpen size={15} />
          Open folder
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => openWithError(openDbmlFileDialog)}
        >
          <FileText size={15} />
          Open file
        </button>
      </div>
    </div>
  );
}

export function Workspace() {
  useDebouncedParse();
  useRevealTableInEditor();
  useExternalDbmlOpen();

  useAppKeymap();
  useNativeAppMenu();

  const panels = useUiStore((s) => s.panels);
  const inspectorWidth = useUiStore((s) => s.inspectorWidth);
  const setInspectorWidth = useUiStore((s) => s.setInspectorWidth);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const openFile = useEditorStore((s) => s.openFile);

  const rightRailRef = useRef<HTMLElement>(null);
  const [resizingInspector, setResizingInspector] = useState(false);

  const onInspectorResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingInspector(true);
  }, []);

  useEffect(() => {
    if (!resizingInspector) {
      return;
    }
    const onMouseMove = (event: MouseEvent) => {
      const rail = rightRailRef.current;
      if (!rail) {
        return;
      }
      const rect = rail.getBoundingClientRect();
      const nextWidth = rect.right - event.clientX;
      setInspectorWidth(nextWidth);
    };
    const onMouseUp = () => setResizingInspector(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizingInspector, setInspectorWidth]);

  useEffect(() => {
    if (projectRoot && entryPoint) {
      void openFile(entryPoint);
    }
  }, [projectRoot, entryPoint, openFile]);

  const externalConflict = useEditorStore((s) => s.externalConflict);
  const reloadFromDisk = useEditorStore((s) => s.reloadFromDisk);
  const saveFile = useEditorStore((s) => s.saveFile);
  const mainContent = useMemo(() => {
    if (!projectRoot) {
      return <Welcome />;
    }
    if (panels.editor && panels.diagram) {
      return (
        <SplitPane
          direction="horizontal"
          initialRatio={0.48}
          first={<EditorPanel />}
          second={<SchemaDiagram />}
        />
      );
    }
    if (panels.editor) {
      return <EditorPanel />;
    }
    if (panels.diagram) {
      return <SchemaDiagram />;
    }
    return (
      <div className="workspace-empty">
        <p>All center panels are hidden.</p>
        <p className="empty-hint">
          Use the Explorer, Editor, Diagram, or Inspector buttons in the header
          to show a panel.
        </p>
      </div>
    );
  }, [panels.editor, panels.diagram, projectRoot]);

  return (
    <div className="workspace">
      <Header />
      {externalConflict && (
        <div className="conflict-banner">
          <span>
            {externalConflict} changed on disk while you were editing.
          </span>
          <button
            type="button"
            className="header-btn"
            onClick={() => void reloadFromDisk(externalConflict)}
          >
            Reload from disk
          </button>
          <button
            type="button"
            className="header-btn primary"
            onClick={() => void saveFile(externalConflict)}
          >
            Overwrite disk
          </button>
        </div>
      )}
      <div className="workspace-body">
        {panels.explorer && (
          <aside className="workspace-rail workspace-rail-left">
            <ProjectExplorer />
          </aside>
        )}
        <main className="workspace-main">{mainContent}</main>
        {projectRoot && panels.inspector && (
          <aside
            ref={rightRailRef}
            className="workspace-rail workspace-rail-right"
            style={{ width: `${inspectorWidth}px` }}
          >
            <div
              className={`workspace-rail-resizer ${resizingInspector ? "dragging" : ""}`}
              onMouseDown={onInspectorResizeStart}
              onDoubleClick={() => setInspectorWidth(DEFAULT_INSPECTOR_WIDTH)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize inspector sidebar"
              title="Drag to resize · Double-click to reset"
            />
            <SchemaInspector />
          </aside>
        )}
      </div>
      <StatusBar />
      <AppSettings />
      <TableEditModal />
    </div>
  );
}

