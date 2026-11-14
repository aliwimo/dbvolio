import { useEditorStore } from "../editor/editor-store";
import { useProjectStore } from "./project-store";
import { useUiStore } from "../../shared/stores/ui-store";

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
