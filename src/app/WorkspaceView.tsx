import { Show } from "solid-js";
import { AppHeader } from "../features/app-header/AppHeader";
import { ProjectExplorer } from "../features/explorer/ProjectExplorer";
import { SchemaInspector } from "../features/inspector/SchemaInspector";
import { TableCreateModal } from "../features/inspector/TableCreateModal";
import { TableEditModal } from "../features/inspector/TableEditModal";
import { ExternalConflictBanner } from "../features/layout/ExternalConflictBanner";
import { ResizableRail } from "../features/layout/ResizableRail";
import { StatusBar } from "../features/layout/StatusBar";
import { WorkspaceMain } from "../features/layout/WorkspaceMain";
import {
  DEFAULT_EXPLORER_WIDTH,
  DEFAULT_INSPECTOR_WIDTH,
  useUiStore,
} from "../shared/stores/ui-store";

export function WorkspaceView() {
  const panels = () => useUiStore((s) => s.panels);
  const explorerWidth = () => useUiStore((s) => s.explorerWidth);
  const setExplorerWidth = useUiStore.getState().setExplorerWidth;
  const inspectorWidth = () => useUiStore((s) => s.inspectorWidth);
  const setInspectorWidth = useUiStore.getState().setInspectorWidth;

  return (
    <div class="workspace">
      <AppHeader />
      <ExternalConflictBanner />

      <div class="workspace-body">
        <Show when={panels().explorer}>
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

        <Show when={panels().inspector}>
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
      <TableEditModal />
      <TableCreateModal />
    </div>
  );
}
