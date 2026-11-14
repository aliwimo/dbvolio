import { X } from "lucide-solid";
import { For, Show } from "solid-js";
import { useEditorStore } from "./editor-store";
import { useProjectStore } from "../projects/project-store";

function basename(relativePath: string): string {
  const parts = relativePath.split("/");
  return parts[parts.length - 1] ?? relativePath;
}

export function formatEditorTabLabel(
  relativePath: string,
  openPaths: string[]
): string {
  const base = basename(relativePath);
  const sameName = openPaths.filter((p) => basename(p) === base);
  if (sameName.length <= 1) {
    return base;
  }
  const segments = relativePath.split("/");
  if (segments.length >= 2) {
    return `${segments[segments.length - 2]}/${base}`;
  }
  return relativePath;
}

export function EditorTabs() {
  const tabs = () => useEditorStore((s) => s.tabs);
  const activePath = () => useEditorStore((s) => s.activePath);
  const setActivePath = useEditorStore.getState().setActivePath;
  const closeTab = useEditorStore.getState().closeTab;

  const openPaths = () => tabs().map((tab) => tab.relativePath);

  return (
    <Show when={tabs().length > 0}>
      <div class="editor-tabs">
        <For each={tabs()}>
          {(tab) => {
            const isActive = () => activePath() === tab.relativePath;
            const isDirty = () => tab.isDirty;
            const label = () => formatEditorTabLabel(tab.relativePath, openPaths());

            return (
              <div
                class={`editor-tab ${isActive() ? "active" : ""} ${isDirty() ? "dirty" : ""}`}
                onClick={() => {
                  setActivePath(tab.relativePath);
                  const projectScope = useProjectStore.getState().projectScope;
                  if (projectScope === "file") {
                    useProjectStore.getState().setEntryPoint(tab.relativePath);
                  }
                }}
              >
                <span class="editor-tab-label" title={tab.relativePath}>
                  {label()}
                </span>
                <span
                  class="editor-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.relativePath);
                  }}
                >
                  <X size={12} />
                </span>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
