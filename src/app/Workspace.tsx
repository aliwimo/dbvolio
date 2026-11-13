import { FileText, FolderOpen } from "lucide-solid";
import { createSignal, createEffect, Show } from "solid-js";
import { ProjectExplorer } from "../components/explorer/ProjectExplorer";
import { DbmlEditor } from "../components/editor/DbmlEditor";
import { EditorTabs } from "../components/editor/EditorTabs";
import { SchemaDiagram } from "../components/diagram/SchemaDiagram";
import { SchemaInspector } from "../components/inspector/SchemaInspector";
import { TableCreateModal } from "../components/inspector/TableCreateModal";
import { TableEditModal } from "../components/inspector/TableEditModal";
import { Header } from "../components/layout/Header";
import { SplitPane } from "../components/layout/SplitPane";
import { StatusBar } from "../components/layout/StatusBar";
import { QuickPickModal } from "../components/quick-pick/QuickPickModal";
import { AppSettings } from "../components/settings/AppSettings";
import { useRevealTableInEditor } from "../features/editor/useRevealTableInEditor";
import { useDebouncedParse } from "../features/parsing/useDebouncedParse";
import { useEditorStore } from "../stores/editor-store";
import { RecentProjectsList } from "../components/projects/RecentProjectsList";
import { useProjectStore } from "../stores/project-store";
import { useExternalDbmlOpen } from "../features/open/useExternalDbmlOpen";
import { useAppKeymap } from "../features/keymap/use-app-keymap";
import { useNativeAppMenu } from "../features/keymap/use-native-app-menu";
import {
  DEFAULT_EXPLORER_WIDTH,
  DEFAULT_INSPECTOR_WIDTH,
  useUiStore,
} from "../stores/ui-store";

function EditorPanel() {
  return (
    <div class="panel panel-fill panel-flush">
      <EditorTabs />
      <div class="panel-content">
        <DbmlEditor />
      </div>
    </div>
  );
}

function Welcome() {
  const openProjectDialog = useProjectStore.getState().openProjectDialog;
  const openDbmlFileDialog = useProjectStore.getState().openDbmlFileDialog;
  const clearRecentProjects = useProjectStore.getState().clearRecentProjects;
  const recentProjects = () => useProjectStore((s) => s.recentProjects);

  const openWithError = (action: () => Promise<void>) => {
    void action().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(message);
    });
  };

  return (
    <div class="welcome">
      <div class="welcome-intro">
        <p class="welcome-title">Open a project</p>
        <p class="empty-hint">
          Open a folder or a single <code>.dbml</code> file, or double-click a
          file in Finder to start here.
        </p>
        <div class="welcome-actions">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            onClick={() => openWithError(openProjectDialog)}
          >
            <FolderOpen size={15} />
            Open folder
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            onClick={() => openWithError(openDbmlFileDialog)}
          >
            <FileText size={15} />
            Open file
          </button>
        </div>
      </div>

      <section
        class="welcome-recent"
        aria-labelledby="welcome-recent-heading"
      >
        <div class="welcome-recent-head">
          <h2 id="welcome-recent-heading" class="welcome-recent-heading">
            Recent
          </h2>
          <Show when={recentProjects().length > 0}>
            <button
              type="button"
              class="welcome-clear"
              onClick={clearRecentProjects}
            >
              Clear
            </button>
          </Show>
        </div>
        <Show
          when={recentProjects().length > 0}
          fallback={<p class="welcome-recent-empty">No recent projects yet.</p>}
        >
          <RecentProjectsList variant="welcome" />
        </Show>
      </section>
    </div>
  );
}

export function Workspace() {
  useDebouncedParse();
  useRevealTableInEditor();
  useExternalDbmlOpen();
  useAppKeymap();
  useNativeAppMenu();

  const panels = () => useUiStore((s) => s.panels);
  const explorerWidth = () => useUiStore((s) => s.explorerWidth);
  const setExplorerWidth = useUiStore.getState().setExplorerWidth;
  const inspectorWidth = () => useUiStore((s) => s.inspectorWidth);
  const setInspectorWidth = useUiStore.getState().setInspectorWidth;

  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const openFile = useEditorStore.getState().openFile;
  const externalConflict = () => useEditorStore((s) => s.externalConflict);
  const reloadFromDisk = useEditorStore.getState().reloadFromDisk;
  const saveFile = useEditorStore.getState().saveFile;

  let leftRailRef: HTMLElement | undefined;
  let rightRailRef: HTMLElement | undefined;
  const [resizingExplorer, setResizingExplorer] = createSignal(false);
  const [resizingInspector, setResizingInspector] = createSignal(false);

  const onExplorerResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    setResizingExplorer(true);
    const onMouseMove = (event: MouseEvent) => {
      if (!leftRailRef) return;
      const rect = leftRailRef.getBoundingClientRect();
      setExplorerWidth(event.clientX - rect.left);
    };
    const onMouseUp = () => {
      setResizingExplorer(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onInspectorResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    setResizingInspector(true);
    const onMouseMove = (event: MouseEvent) => {
      if (!rightRailRef) return;
      const rect = rightRailRef.getBoundingClientRect();
      setInspectorWidth(rect.right - event.clientX);
    };
    const onMouseUp = () => {
      setResizingInspector(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  createEffect(() => {
    const ep = entryPoint();
    if (projectRoot() && ep) {
      void openFile(ep);
    }
  });

  return (
    <div class="workspace">
      <Header />

      <Show when={externalConflict()}>
        {(conflict) => (
          <div class="conflict-banner">
            <span>
              {conflict()} changed on disk while you were editing.
            </span>
            <button
              type="button"
              class="header-btn"
              onClick={() => void reloadFromDisk(conflict())}
            >
              Reload from disk
            </button>
            <button
              type="button"
              class="header-btn primary"
              onClick={() => void saveFile(conflict())}
            >
              Overwrite disk
            </button>
          </div>
        )}
      </Show>

      <div class="workspace-body">
        <Show when={projectRoot() && panels().explorer}>
          <aside
            ref={leftRailRef}
            class="workspace-rail workspace-rail-left"
            style={{ width: `${explorerWidth()}px` }}
          >
            <ProjectExplorer />
            <div
              class={`workspace-rail-resizer workspace-rail-resizer-trailing ${resizingExplorer() ? "dragging" : ""}`}
              onMouseDown={onExplorerResizeStart}
              onDblClick={() => setExplorerWidth(DEFAULT_EXPLORER_WIDTH)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize explorer sidebar"
              title="Drag to resize · Double-click to reset"
            />
          </aside>
        </Show>

        <main class="workspace-main">
          <Show
            when={projectRoot()}
            fallback={<Welcome />}
          >
            <Show
              when={panels().editor && panels().diagram}
              fallback={
                <Show
                  when={panels().editor}
                  fallback={
                    <Show
                      when={panels().diagram}
                      fallback={
                        <div class="workspace-empty">
                          <p>All center panels are hidden.</p>
                          <p class="empty-hint">
                            Use the Explorer, Editor, Diagram, or Inspector buttons
                            in the header to show a panel.
                          </p>
                        </div>
                      }
                    >
                      <SchemaDiagram />
                    </Show>
                  }
                >
                  <EditorPanel />
                </Show>
              }
            >
              <SplitPane
                direction="horizontal"
                initialRatio={0.48}
                first={<EditorPanel />}
                second={<SchemaDiagram />}
              />
            </Show>
          </Show>
        </main>

        <Show when={projectRoot() && panels().inspector}>
          <aside
            ref={rightRailRef}
            class="workspace-rail workspace-rail-right"
            style={{ width: `${inspectorWidth()}px` }}
          >
            <div
              class={`workspace-rail-resizer ${resizingInspector() ? "dragging" : ""}`}
              onMouseDown={onInspectorResizeStart}
              onDblClick={() => setInspectorWidth(DEFAULT_INSPECTOR_WIDTH)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize inspector sidebar"
              title="Drag to resize · Double-click to reset"
            />
            <SchemaInspector />
          </aside>
        </Show>
      </div>

      <StatusBar />
      <AppSettings />
      <QuickPickModal />
      <TableEditModal />
      <TableCreateModal />
    </div>
  );
}
