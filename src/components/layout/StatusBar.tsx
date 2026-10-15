import { useDiagramStore } from "../../stores/diagram-store";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";

export function StatusBar() {
  const activePath = useEditorStore((s) => s.activePath);
  const activeTab = useEditorStore((s) =>
    s.tabs.find((t) => t.relativePath === s.activePath),
  );
  const model = useDiagramStore((s) => s.lastValidModel);
  const isStale = useDiagramStore((s) => s.isStale);
  const diagnostics = useDiagramStore((s) => s.diagnostics);
  const selectedTableId = useDiagramStore((s) => s.selectedTableId);
  const projectName = useProjectStore((s) => s.projectName);

  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const parseLabel = isStale
    ? "Diagram outdated"
    : errors > 0
      ? `${errors} error${errors === 1 ? "" : "s"}`
      : model
        ? "Schema OK"
        : projectName
          ? "No schema"
          : "Open a project";

  const fileLabel = activePath?.split("/").pop();

  return (
    <footer className="status-bar status-bar-compact">
      <span className={`status-pill ${errors > 0 ? "error" : isStale ? "warn" : ""}`}>
        {parseLabel}
      </span>
      {model && (
        <span className="status-muted">
          {model.tables.length} tables · {model.references.length} refs
        </span>
      )}
      {selectedTableId && (
        <span className="status-muted">Selected {selectedTableId}</span>
      )}
      {fileLabel && (
        <span className="status-muted status-file">
          {fileLabel}
          {activeTab?.isDirty ? " • unsaved" : ""}
        </span>
      )}
    </footer>
  );
}
