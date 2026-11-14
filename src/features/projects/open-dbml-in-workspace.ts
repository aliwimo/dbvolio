import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";

export function openDbmlInWorkspace(relativePath: string): void {
  useProjectStore.getState().setEntryPoint(relativePath);
  useUiStore.getState().setPanel("editor", true);
  void useEditorStore
    .getState()
    .openFile(relativePath)
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(message);
    });
}
