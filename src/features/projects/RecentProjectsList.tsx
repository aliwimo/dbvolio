import { FileText, FolderOpen, X } from "lucide-solid";
import { For, Show } from "solid-js";
import { useProjectStore } from "./project-store";

export function recentProjectLabel(path: string): {
  name: string;
  path: string;
  isFile: boolean;
} {
  const sep = path.includes("\\") ? "\\" : "/";
  const parts = path.split(/[/\\]/).filter(Boolean);
  const name = parts.pop() ?? path;
  const rooted = path.startsWith("/") || path.startsWith("\\");
  const parent = parts.length
    ? `${rooted ? sep : ""}${parts.join(sep)}`
    : path;
  return { name, path: parent, isFile: name.toLowerCase().endsWith(".dbml") };
}

export function RecentProjectsList(props: {
  variant?: "default" | "compact" | "settings" | "welcome";
  onOpened?: () => void;
  onSelected?: () => void;
}) {
  const recentProjects = () => useProjectStore((s) => s.recentProjects);
  const openProjectPath = useProjectStore.getState().openProjectPath;
  const openProjectDialog = useProjectStore.getState().openProjectDialog;
  const openDbmlFileDialog = useProjectStore.getState().openDbmlFileDialog;
  const removeRecentProject = useProjectStore.getState().removeRecentProject;
  const clearRecentProjects = useProjectStore.getState().clearRecentProjects;

  const variant = () => props.variant ?? "default";

  return (
    <Show
      when={recentProjects().length > 0}
      fallback={
        <div class={`recent-projects recent-projects-${variant()} recent-projects-empty`}>
          <p class="recent-projects-empty-text">No recent projects yet.</p>
          <Show when={variant() !== "compact" && variant() !== "welcome"}>
            <div class="welcome-actions">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                onClick={() => {
                  void openProjectDialog().then(() => {
                    props.onOpened?.();
                    props.onSelected?.();
                  });
                }}
              >
                <FolderOpen size={14} />
                Open folder…
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                onClick={() => {
                  void openDbmlFileDialog().then(() => {
                    props.onOpened?.();
                    props.onSelected?.();
                  });
                }}
              >
                <FileText size={14} />
                Open file…
              </button>
            </div>
          </Show>
        </div>
      }
    >
      <div class={`recent-projects recent-projects-${variant()}`}>
        <ul class="recent-projects-list" aria-label="Recent projects">
          <For each={recentProjects()}>
            {(path) => {
              const info = () => recentProjectLabel(path);
              return (
                <li class="recent-projects-item">
                  <button
                    type="button"
                    class="recent-projects-open"
                    title={path}
                    onClick={() => {
                      void openProjectPath(path)
                        .then(() => {
                          props.onOpened?.();
                          props.onSelected?.();
                        })
                        .catch((err: unknown) => {
                          const message =
                            err instanceof Error ? err.message : String(err);
                          window.alert(message);
                        });
                    }}
                  >
                    <Show
                      when={info().isFile}
                      fallback={
                        <FolderOpen
                          size={15}
                          class="recent-projects-icon"
                          aria-hidden
                        />
                      }
                    >
                      <FileText
                        size={15}
                        class="recent-projects-icon"
                        aria-hidden
                      />
                    </Show>
                    <span class="recent-projects-text">
                      <span class="recent-projects-name">{info().name}</span>
                      <span class="recent-projects-path">{info().path}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    class="recent-projects-remove"
                    title={`Remove ${info().name} from recents`}
                    aria-label={`Remove ${info().name} from recents`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentProject(path);
                    }}
                  >
                    <X size={13} stroke-width={1.75} />
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
        <Show when={variant() !== "compact" && variant() !== "welcome"}>
          <div class="recent-projects-footer">
            <button
              type="button"
              class="btn btn-ghost btn-sm recent-projects-clear"
              onClick={clearRecentProjects}
            >
              Clear recent
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
}
