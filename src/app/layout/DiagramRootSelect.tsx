import { ChevronDown, FileCode } from "lucide-solid";
import { For, Show } from "solid-js";
import { useProjectStore } from "../../features/projects/project-store";

export function DiagramRootSelect() {
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const files = () => useProjectStore((s) => s.files);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const setEntryPoint = useProjectStore.getState().setEntryPoint;

  const dbmlPaths = () =>
    files()
      .filter((f) => !f.isDirectory && f.relativePath.endsWith(".dbml"))
      .map((f) => f.relativePath)
      .sort((a, b) => a.localeCompare(b));

  const value = () => {
    const ep = entryPoint();
    const paths = dbmlPaths();
    return ep && paths.includes(ep) ? ep : paths[0];
  };

  return (
    <Show when={projectRoot() && dbmlPaths().length > 0}>
      <label class="header-diagram-root" title="DBML file used to build the diagram">
        <FileCode size={13} strokeWidth={2} aria-hidden />
        <select
          class="select-compact header-entry-select"
          value={value()}
          onChange={(e) => setEntryPoint(e.currentTarget.value)}
          aria-label="Diagram root DBML file"
        >
          <For each={dbmlPaths()}>
            {(path) => (
              <option value={path} title={path}>
                {path}
              </option>
            )}
          </For>
        </select>
        <ChevronDown size={13} class="header-diagram-chevron" aria-hidden />
      </label>
    </Show>
  );
}
