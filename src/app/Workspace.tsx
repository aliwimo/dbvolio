import { FileText, FolderOpen } from "lucide-solid";
import { createEffect, Show } from "solid-js";
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
import { useUiStore } from "../stores/ui-store";

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

      <Show when={recentProjects().length > 0}>
        <section class="welcome-recent">
          <p class="welcome-subtitle">Recent projects</p>
          <RecentProjectsList variant="welcome" />
        </section>
      </Show>
    </div>
  );
}

export function Workspace() {
  useDebouncedParse();
  useRevealTableInEditor();
  useExternalDbmlOpen();
  useAppKeymap();
  useNativeAppMenu();

  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const panels = () => useUiStore((s) => s.panels);
  const openFile = useEditorStore.getState().openFile;
  const explorerWidth = () => useUiStore((s) => s.explorerWidth);
  const inspectorWidth = () => useUiStore((s) => s.inspectorWidth);

  createEffect(() => {
    const ep = entryPoint();
    if (ep) {
      void openFile(ep);
    }
  });

  return (
    <div class="workspace-layout">
      <Header />

      <main class="workspace-body">
        <Show when={projectRoot()} fallback={<Welcome />}>
          <div class="workspace-main">
            <Show when={panels().explorer}>
              <div
                class="workspace-sidebar"
                style={{ width: `${explorerWidth()}px` }}
              >
                <ProjectExplorer />
              </div>
            </Show>

            <div class="workspace-center">
              <Show
                when={panels().editor && panels().diagram}
                fallback={
                  <Show
                    when={panels().editor}
                    fallback={
                      <Show when={panels().diagram}>
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
                  initialRatio={0.4}
                  first={<EditorPanel />}
                  second={<SchemaDiagram />}
                />
              </Show>
            </div>

            <Show when={panels().inspector}>
              <div
                class="workspace-sidebar workspace-sidebar-right"
                style={{ width: `${inspectorWidth()}px` }}
              >
                <SchemaInspector />
              </div>
            </Show>
          </div>
        </Show>
      </main>

      <StatusBar />
      <QuickPickModal />
      <AppSettings />
      <TableCreateModal />
      <TableEditModal />
    </div>
  );
}
