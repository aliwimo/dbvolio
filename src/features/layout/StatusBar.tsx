import { Show } from "solid-js";
import { useDiagramStore } from "../../features/diagram/diagram-store";
import { useEditorStore } from "../../features/editor/editor-store";
import { useProjectStore } from "../../features/projects/project-store";

export function StatusBar() {
  const activePath = () => useEditorStore((s) => s.activePath);
  const activeTab = () =>
    useEditorStore((s) => s.tabs.find((t) => t.relativePath === s.activePath));
  const model = () => useDiagramStore((s) => s.lastValidModel);
  const isStale = () => useDiagramStore((s) => s.isStale);
  const diagnostics = () => useDiagramStore((s) => s.diagnostics);
  const selectedTableId = () => useDiagramStore((s) => s.selectedTableId);
  const projectName = () => useProjectStore((s) => s.projectName);

  const errors = () => diagnostics().filter((d) => d.severity === "error").length;
  const parseLabel = () =>
    isStale()
      ? "Diagram outdated"
      : errors() > 0
      ? `${errors()} error${errors() === 1 ? "" : "s"}`
      : model()
      ? "Schema OK"
      : projectName()
      ? "No schema"
      : "Open a project";

  const fileLabel = () => activePath()?.split("/").pop();

  return (
    <footer class="status-bar status-bar-compact">
      <span class={`status-pill ${errors() > 0 ? "error" : isStale() ? "warn" : ""}`}>
        {parseLabel()}
      </span>
      <Show when={model()}>
        {(m) => {
          const tableCount = () => m().tables.length;
          const groupCount = () => m().tableGroups?.length ?? 0;
          const refCount = () => m().references.length;

          return (
            <span class="status-muted">
              {tableCount()} tables
              {groupCount() > 0
                ? ` · ${groupCount()} ${groupCount() === 1 ? "group" : "groups"}`
                : ""}{" "}
              · {refCount()} refs
            </span>
          );
        }}
      </Show>
      <Show when={selectedTableId()}>
        <span class="status-muted">Selected {selectedTableId()}</span>
      </Show>
      <Show when={fileLabel()}>
        <span class="status-muted status-file">
          {fileLabel()}
          {activeTab()?.isDirty ? " • unsaved" : ""}
        </span>
      </Show>
    </footer>
  );
}
