import { useEffect } from "react";
import { revealTableInEditorIfOpen } from "../schema/apply-schema-edits";
import { useDiagramStore } from "../../stores/diagram-store";
import { useProjectStore } from "../../stores/project-store";

/** When a diagram table is selected, scroll to its definition if the file tab is open. */
export function useRevealTableInEditor() {
  const selectedTableId = useDiagramStore((s) => s.selectedTableId);
  const files = useProjectStore((s) => s.files);

  useEffect(() => {
    if (!selectedTableId) {
      return;
    }
    const table = useDiagramStore
      .getState()
      .lastValidModel?.tables.find((t) => t.id === selectedTableId);
    if (!table) {
      return;
    }
    const projectFiles = files.filter((f) => !f.isDirectory);
    void revealTableInEditorIfOpen(table, projectFiles);
  }, [selectedTableId, files]);
}
