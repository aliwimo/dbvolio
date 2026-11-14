import { FileText, FolderOpen } from "lucide-solid";
import { Show } from "solid-js";
import { RecentProjectsList } from "../../features/projects/RecentProjectsList";
import { useProjectStore } from "../../features/projects/project-store";
import { Button } from "../../shared/ui";

export function Welcome() {
  const openProjectDialog = useProjectStore.getState().openProjectDialog;
  const openDbmlFileDialog = useProjectStore.getState().openDbmlFileDialog;
  const clearRecentProjects = useProjectStore.getState().clearRecentProjects;
  const recentProjects = () => useProjectStore((s) => s.recentProjects);

  const openWithError = (action: () => Promise<void>) => {
    void action().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(message);
    });
  };

  return (
    <div class="welcome">
      <div class="welcome-intro">
        <p class="welcome-title">Open a project</p>
        <p class="empty-hint">
          Open a folder or a single <code>.dbml</code> file, or double-click a
          file in Finder to start here.
        </p>
        <div class="welcome-actions">
          <Button size="sm" onClick={() => openWithError(openProjectDialog)}>
            <FolderOpen size={15} />
            Open folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openWithError(openDbmlFileDialog)}
          >
            <FileText size={15} />
            Open file
          </Button>
        </div>
      </div>

      <section
        class="welcome-recent"
        aria-labelledby="welcome-recent-heading"
      >
        <div class="welcome-recent-head">
          <h2 id="welcome-recent-heading" class="welcome-recent-heading">
            Recent
          </h2>
          <Show when={recentProjects().length > 0}>
            <button
              type="button"
              class="welcome-clear"
              onClick={clearRecentProjects}
            >
              Clear
            </button>
          </Show>
        </div>
        <Show
          when={recentProjects().length > 0}
          fallback={<p class="welcome-recent-empty">No recent projects yet.</p>}
        >
          <RecentProjectsList variant="welcome" />
        </Show>
      </section>
    </div>
  );
}
