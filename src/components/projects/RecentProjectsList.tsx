import { Clock, FileText, FolderOpen, X } from "lucide-react";
import { useProjectStore } from "../../stores/project-store";

export function recentProjectLabel(path: string): {
  name: string;
  path: string;
} {
  const parts = path.split(/[/\\]/).filter(Boolean);
  const name = parts.pop() ?? path;
  return { name, path };
}

export function RecentProjectsList({
  variant = "default",
  onOpened,
}: {
  variant?: "default" | "compact" | "settings" | "welcome";
  onOpened?: () => void;
}) {
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const openProjectPath = useProjectStore((s) => s.openProjectPath);
  const openProjectDialog = useProjectStore((s) => s.openProjectDialog);
  const openDbmlFileDialog = useProjectStore((s) => s.openDbmlFileDialog);
  const removeRecentProject = useProjectStore((s) => s.removeRecentProject);
  const clearRecentProjects = useProjectStore((s) => s.clearRecentProjects);

  if (recentProjects.length === 0) {
    return (
      <div className={`recent-projects recent-projects-${variant} recent-projects-empty`}>
        <p className="recent-projects-empty-text">No recent projects yet.</p>
        {variant !== "compact" && variant !== "welcome" && (
          <div className="welcome-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                void openProjectDialog().then(onOpened);
              }}
            >
              <FolderOpen size={14} />
              Open folder…
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                void openDbmlFileDialog().then(onOpened);
              }}
            >
              <FileText size={14} />
              Open file…
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`recent-projects recent-projects-${variant}`}>
      <ul className="recent-projects-list" aria-label="Recent projects">
        {recentProjects.map((path) => {
          const { name } = recentProjectLabel(path);
          return (
            <li key={path} className="recent-projects-item">
              <button
                type="button"
                className="recent-projects-open"
                title={path}
                onClick={() => {
                  void openProjectPath(path)
                    .then(onOpened)
                    .catch((err: unknown) => {
                      const message =
                        err instanceof Error ? err.message : String(err);
                      window.alert(message);
                    });
                }}
              >
                <Clock size={14} className="recent-projects-icon" aria-hidden />
                <span className="recent-projects-text">
                  <span className="recent-projects-name">{name}</span>
                  {variant !== "compact" && (
                    <span className="recent-projects-path">{path}</span>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="btn-icon btn-icon-xs recent-projects-remove"
                title="Remove from recent"
                aria-label={`Remove ${name} from recent`}
                onClick={() => removeRecentProject(path)}
              >
                <X size={12} />
              </button>
            </li>
          );
        })}
      </ul>
      {variant !== "welcome" && (
        <div className="recent-projects-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void openProjectDialog().then(onOpened);
            }}
          >
            <FolderOpen size={14} />
            Open folder…
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void openDbmlFileDialog().then(onOpened);
            }}
          >
            <FileText size={14} />
            Open file…
          </button>
          {variant !== "compact" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearRecentProjects}
            >
              Clear list
            </button>
          )}
        </div>
      )}
      {variant === "welcome" && recentProjects.length > 0 && (
        <div className="recent-projects-actions recent-projects-actions-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={clearRecentProjects}
          >
            Clear list
          </button>
        </div>
      )}
    </div>
  );
}
