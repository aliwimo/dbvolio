import { createEffect, Show } from "solid-js";
import { useEditorStore } from "../features/editor/editor-store";
import { useRevealTableInEditor } from "../features/editor/useRevealTableInEditor";
import { ProjectExplorer } from "../features/explorer/ProjectExplorer";
import { SchemaInspector } from "../features/inspector/SchemaInspector";
import { TableCreateModal } from "../features/inspector/TableCreateModal";
import { TableEditModal } from "../features/inspector/TableEditModal";
import { useAppKeymap } from "../features/keymap/use-app-keymap";
import { useNativeAppMenu } from "../features/keymap/use-native-app-menu";
import { useProjectStore } from "../features/projects/project-store";
import { useExternalDbmlOpen } from "../features/projects/useExternalDbmlOpen";
import { QuickPickModal } from "../features/quick-pick/QuickPickModal";
import { useDebouncedParse } from "../features/schema/useDebouncedParse";
import { AppSettings } from "../features/settings/AppSettings";
import {
  DEFAULT_EXPLORER_WIDTH,
  DEFAULT_INSPECTOR_WIDTH,
  useUiStore,
} from "../shared/stores/ui-store";
import { ExternalConflictBanner } from "../features/layout/ExternalConflictBanner";
import { AppHeader } from "../features/app-header/AppHeader";
import { ResizableRail } from "../features/layout/ResizableRail";
import { StatusBar } from "../features/layout/StatusBar";
import { WorkspaceMain } from "../features/layout/WorkspaceMain";

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

  createEffect(() => {
    const ep = entryPoint();
    if (projectRoot() && ep) {
      void openFile(ep);
    }
  });

  return (
    <div class="workspace">
      <AppHeader />
      <ExternalConflictBanner />

      <div class="workspace-body">
        <Show when={projectRoot() && panels().explorer}>
          <ResizableRail
            side="left"
            width={explorerWidth()}
            defaultWidth={DEFAULT_EXPLORER_WIDTH}
            onResize={setExplorerWidth}
            ariaLabel="Resize explorer sidebar"
          >
            <ProjectExplorer />
          </ResizableRail>
        </Show>

        <WorkspaceMain />

        <Show when={projectRoot() && panels().inspector}>
          <ResizableRail
            side="right"
            width={inspectorWidth()}
            defaultWidth={DEFAULT_INSPECTOR_WIDTH}
            onResize={setInspectorWidth}
            ariaLabel="Resize inspector sidebar"
          >
            <SchemaInspector />
          </ResizableRail>
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
