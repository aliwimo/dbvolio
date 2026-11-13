import { createEffect } from "solid-js";
import { revealTableInEditorIfOpen } from "../schema/apply-schema-edits";
import { useDiagramStore } from "../../stores/diagram-store";
import { useProjectStore } from "../../stores/project-store";

/** When a diagram table is selected, scroll to its definition if the file tab is open. */
export function useRevealTableInEditor() {
  // The store signal updates on every setState, so this must ignore repeats
  // or each hover/parse snaps the editor back and wheel scrolling never sticks.
  let revealedId: string | null = null;

  createEffect(() => {
    const selectedTableId = useDiagramStore((s) => s.selectedTableId);
    if (selectedTableId === revealedId) {
      return;
    }
    revealedId = selectedTableId;
    if (!selectedTableId) {
      return;
    }
    const table = useDiagramStore
      .getState()
      .lastValidModel?.tables.find((t) => t.id === selectedTableId);
    if (!table) {
      revealedId = null;
      return;
    }
    const projectFiles = useProjectStore
      .getState()
      .files.filter((f) => !f.isDirectory);
    void revealTableInEditorIfOpen(table, projectFiles);
  });
}
