import { useEffect, useMemo } from "react";
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
import { useAppKeymap } from "../features/keymap/use-app-keymap";
import { useUiStore } from "../stores/ui-store";

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

export function Workspace() {
  useDebouncedParse();
  useRevealTableInEditor();

  useAppKeymap();

  const panels = useUiStore((s) => s.panels);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const openFile = useEditorStore((s) => s.openFile);

  useEffect(() => {
    if (projectRoot && entryPoint) {
      void openFile(entryPoint);
    }
  }, [projectRoot, entryPoint, openFile]);

  const externalConflict = useEditorStore((s) => s.externalConflict);
  const reloadFromDisk = useEditorStore((s) => s.reloadFromDisk);
  const saveFile = useEditorStore((s) => s.saveFile);
  const mainContent = useMemo(() => {
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
  }, [panels.editor, panels.diagram]);

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
        {panels.inspector && (
          <aside className="workspace-rail workspace-rail-right">
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
