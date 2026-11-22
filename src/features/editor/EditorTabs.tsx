import { X } from "lucide-solid";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
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

  const [menu, setMenu] = createSignal<{
    x: number;
    y: number;
    relativePath: string;
  } | null>(null);

  createEffect(() => {
    if (!menu()) return;
    const close = () => setMenu(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", close);
    onCleanup(() => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", close);
    });
  });

  const openPaths = () => tabs().map((tab) => tab.relativePath);

  const closePaths = (paths: string[]) => {
    for (const p of paths) {
      closeTab(p);
    }
    setMenu(null);
  };

  const menuTargetIndex = () => {
    const m = menu();
    if (!m) return -1;
    return tabs().findIndex((t) => t.relativePath === m.relativePath);
  };

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
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, relativePath: tab.relativePath });
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

      <Show when={menu()}>
        {(m) => {
          const idx = () => menuTargetIndex();
          const allTabs = () => tabs();
          const hasOthers = () => allTabs().length > 1;
          const hasLeft = () => idx() > 0;
          const hasRight = () => idx() >= 0 && idx() < allTabs().length - 1;

          return (
            <Portal>
              <div
                class="fixed z-50 min-w-[176px] rounded-md border border-[var(--border)] bg-[var(--bg-panel)] p-1 shadow-lg"
                style={{ left: `${m().x}px`, top: `${m().y}px` }}
                onPointerDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
              >
                <button
                  type="button"
                  class="flex w-full cursor-pointer items-center rounded px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  onClick={() => closePaths([m().relativePath])}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={!hasOthers()}
                  class="flex w-full cursor-pointer items-center rounded px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    closePaths(
                      allTabs()
                        .filter((t) => t.relativePath !== m().relativePath)
                        .map((t) => t.relativePath)
                    )
                  }
                >
                  Close Others
                </button>
                <button
                  type="button"
                  disabled={!hasLeft()}
                  class="flex w-full cursor-pointer items-center rounded px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    closePaths(
                      allTabs()
                        .slice(0, idx())
                        .map((t) => t.relativePath)
                    )
                  }
                >
                  Close to the Left
                </button>
                <button
                  type="button"
                  disabled={!hasRight()}
                  class="flex w-full cursor-pointer items-center rounded px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={() =>
                    closePaths(
                      allTabs()
                        .slice(idx() + 1)
                        .map((t) => t.relativePath)
                    )
                  }
                >
                  Close to the Right
                </button>
                <button
                  type="button"
                  class="flex w-full cursor-pointer items-center rounded px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  onClick={() => closePaths(allTabs().map((t) => t.relativePath))}
                >
                  Close All
                </button>
                <div class="my-1 h-px bg-[var(--border)]" />
                <button
                  type="button"
                  class="flex w-full cursor-pointer items-center rounded px-2.5 py-1.5 text-left text-xs text-[var(--text)] hover:bg-[var(--bg-hover)]"
                  onClick={() => {
                    void navigator.clipboard?.writeText(m().relativePath);
                    setMenu(null);
                  }}
                >
                  Copy Path
                </button>
              </div>
            </Portal>
          );
        }}
      </Show>
    </Show>
  );
}
