import { Clock, FileCode } from "lucide-solid";
import { createMemo, createEffect, onCleanup, onMount, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { filesForScope } from "../projects/project-scope-files";
import { openDbmlInWorkspace } from "../projects/open-dbml-in-workspace";
import { quickPickMatchesQuery } from "./filter-quick-pick-items";
import { recentProjectLabel } from "../projects/RecentProjectsList";
import { useProjectStore } from "../projects/project-store";
import {
  useQuickPickStore,
  type QuickPickKind,
} from "./quick-pick-store";

interface PickItem {
  id: string;
  label: string;
  description?: string;
  icon: "recent" | "file";
  run: () => void;
}

function titleForKind(kind: QuickPickKind): string {
  return kind === "recent" ? "Open Recent" : "Go to File";
}

function placeholderForKind(kind: QuickPickKind): string {
  return kind === "recent"
    ? "Search recent projects…"
    : "Search files by name…";
}

export function QuickPickModal() {
  const kind = () => useQuickPickStore((s) => s.kind);
  const query = () => useQuickPickStore((s) => s.query);
  const selectedIndex = () => useQuickPickStore((s) => s.selectedIndex);
  const setQuery = useQuickPickStore.getState().setQuery;
  const setSelectedIndex = useQuickPickStore.getState().setSelectedIndex;
  const close = useQuickPickStore.getState().close;

  const recentProjects = () => useProjectStore((s) => s.recentProjects);
  const openProjectPath = useProjectStore.getState().openProjectPath;
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const projectScope = () => useProjectStore((s) => s.projectScope);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const files = () => useProjectStore((s) => s.files);

  let inputRef: HTMLInputElement | undefined;

  const items = createMemo((): PickItem[] => {
    const k = kind();
    if (!k) return [];

    if (k === "recent") {
      return recentProjects().map((path) => {
        const { name } = recentProjectLabel(path);
        return {
          id: path,
          label: name,
          description: path,
          icon: "recent" as const,
          run: () => {
            void openProjectPath(path).catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              window.alert(message);
            });
          },
        };
      });
    }

    if (!projectRoot()) return [];

    const scoped = filesForScope(files(), projectScope(), entryPoint());
    return scoped
      .filter((f) => !f.isDirectory && f.relativePath.endsWith(".dbml"))
      .map((f) => {
        const parts = f.relativePath.split("/");
        const name = parts[parts.length - 1] ?? f.relativePath;
        return {
          id: f.relativePath,
          label: name,
          description: f.relativePath,
          icon: "file" as const,
          run: () => {
            void openDbmlInWorkspace(f.relativePath);
          },
        };
      });
  });

  const filtered = createMemo(() =>
    items().filter((item) =>
      quickPickMatchesQuery(item.label, query())
    )
  );

  createEffect(() => {
    if (kind()) {
      setTimeout(() => inputRef?.focus(), 10);
    }
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (!kind()) return;
    const list = filtered();
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((selectedIndex() + 1) % Math.max(1, list.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((selectedIndex() - 1 + list.length) % Math.max(1, list.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = list[selectedIndex()];
      if (item) {
        close();
        item.run();
      }
    }
  };

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <Show when={kind()}>
      {(k) => (
        <Portal>
          <div
            class="modal-overlay quick-pick-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              class="quick-pick"
              role="dialog"
              aria-modal="true"
              aria-label={titleForKind(k())}
            >
              <div class="quick-pick-input-wrap">
                <input
                  ref={inputRef}
                  class="quick-pick-input"
                  placeholder={placeholderForKind(k())}
                  value={query()}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                />
              </div>

              <ul class="quick-pick-list" role="listbox">
                <For each={filtered()}>
                  {(item, index) => {
                    const isSelected = () => index() === selectedIndex();
                    return (
                      <li
                        class={`quick-pick-item ${isSelected() ? "active" : ""}`}
                        role="option"
                        aria-selected={isSelected()}
                        onClick={() => {
                          close();
                          item.run();
                        }}
                      >
                        <span class="quick-pick-item-icon">
                          <Show
                            when={item.icon === "recent"}
                            fallback={<FileCode size={14} />}
                          >
                            <Clock size={14} />
                          </Show>
                        </span>
                        <span class="quick-pick-item-text">
                          <span class="quick-pick-item-label">{item.label}</span>
                          <Show when={item.description}>
                            <span class="quick-pick-item-desc">{item.description}</span>
                          </Show>
                        </span>
                      </li>
                    );
                  }}
                </For>
                <Show when={filtered().length === 0}>
                  <li class="quick-pick-empty">No results found</li>
                </Show>
              </ul>
            </div>
          </div>
        </Portal>
      )}
    </Show>
  );
}
