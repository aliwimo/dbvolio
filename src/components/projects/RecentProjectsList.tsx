import { Clock, FileText, FolderOpen, X } from "lucide-solid";
import { For, Show } from "solid-js";
import { useProjectStore } from "../../stores/project-store";

export function recentProjectLabel(path: string): {
  name: string;
  path: string;
} {
  const parts = path.split(/[/\\]/).filter(Boolean);
  const name = parts.pop() ?? path;
  return { name, path };
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
                    <Clock size={13} class="recent-projects-icon" aria-hidden />
                    <span class="recent-projects-name">{info().name}</span>
                    <span class="recent-projects-path">{info().path}</span>
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
                    <X size={12} />
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
        <Show when={variant() !== "compact"}>
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
