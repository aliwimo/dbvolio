import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { useQuickPickStore } from "../../stores/quick-pick-store";
import { useUiStore } from "../../stores/ui-store";
import type { CommandId } from "./types";

function requireProjectForPanelToggle(): boolean {
  return Boolean(useProjectStore.getState().projectRoot);
}

export function executeCommand(commandId: CommandId): void {
  switch (commandId) {
    case "project.open":
      void useProjectStore.getState().openProjectDialog();
      return;
    case "project.openFile":
      void useProjectStore.getState().openDbmlFileDialog();
      return;
    case "project.openRecent":
      useQuickPickStore.getState().open("recent");
      return;
    case "project.close":
      void useProjectStore.getState().closeProject();
      return;
    case "file.save":
      void useEditorStore.getState().saveActive();
      return;
    case "file.closeEditor": {
      const { activePath, closeTab } = useEditorStore.getState();
      if (activePath) {
        closeTab(activePath);
      }
      return;
    }
    case "workbench.quickOpen":
      useQuickPickStore.getState().open("files");
      return;
    case "settings.open":
      useUiStore.getState().openSettings();
      return;
    case "workbench.toggleExplorer":
      if (!requireProjectForPanelToggle()) {
        return;
      }
      useUiStore.getState().togglePanel("explorer");
      return;
    case "workbench.showExplorer":
      if (!requireProjectForPanelToggle()) {
        return;
      }
      useUiStore.getState().setPanel("explorer", true);
      return;
    case "panel.toggleEditor":
      if (!requireProjectForPanelToggle()) {
        return;
      }
      useUiStore.getState().togglePanel("editor");
      return;
    case "panel.toggleDiagram":
      if (!requireProjectForPanelToggle()) {
        return;
      }
      useUiStore.getState().togglePanel("diagram");
      return;
    case "panel.toggleInspector":
      if (!requireProjectForPanelToggle()) {
        return;
      }
      useUiStore.getState().togglePanel("inspector");
      return;
    case "theme.toggle":
      useUiStore.getState().toggleTheme();
      return;
    default: {
      const _exhaustive: never = commandId;
      return _exhaustive;
    }
  }
}
