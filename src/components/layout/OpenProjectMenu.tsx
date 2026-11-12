import { ChevronDown, FileText, FolderOpen, X } from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { useCommandKeybindingLabel } from "../../features/keymap/format-command-keybinding";
import { RecentProjectsList } from "../projects/RecentProjectsList";
import { useProjectStore } from "../../stores/project-store";

export function OpenProjectMenu() {
  const openProjectDialog = useProjectStore.getState().openProjectDialog;
  const openDbmlFileDialog = useProjectStore.getState().openDbmlFileDialog;
  const closeProject = useProjectStore.getState().closeProject;
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const projectScope = () => useProjectStore((s) => s.projectScope);
  const recentProjects = () => useProjectStore((s) => s.recentProjects);
  const closeShortcut = () => useCommandKeybindingLabel("project.close");
  const [open, setOpen] = createSignal(false);
  let wrapRef: HTMLDivElement | undefined;

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open()) return;
      if (wrapRef && !wrapRef.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    onCleanup(() => document.removeEventListener("mousedown", onDocClick));
  });

  const run = (action: () => Promise<void>) => {
    setOpen(false);
    void action().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(message);
    });
  };

  return (
    <div class="header-dropdown open-project-menu" ref={wrapRef}>
      <div class="header-dropdown-trigger open-project-menu-trigger">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          title="Open folder or file"
          aria-label="Open folder or file"
          aria-expanded={open()}
          onClick={() => setOpen((v) => !v)}
        >
          <FolderOpen size={15} />
          <span class="header-btn-label">Open</span>
          <ChevronDown size={14} class="open-project-menu-chevron" />
        </button>
      </div>
      <Show when={open()}>
        <div class="header-dropdown-menu open-project-menu-popover" role="menu">
          <button
            type="button"
            class="header-dropdown-item"
            role="menuitem"
            onClick={() => run(openProjectDialog)}
          >
            <FolderOpen size={14} />
            <span class="header-dropdown-item-label">Open folder…</span>
          </button>
          <button
            type="button"
            class="header-dropdown-item"
            role="menuitem"
            onClick={() => run(openDbmlFileDialog)}
          >
            <FileText size={14} />
            <span class="header-dropdown-item-label">Open file…</span>
          </button>
          <Show when={projectRoot()}>
            <div class="header-dropdown-divider" role="separator" />
            <button
              type="button"
              class="header-dropdown-item"
              role="menuitem"
              onClick={() => run(closeProject)}
            >
              <X size={14} />
              <span class="header-dropdown-item-label">
                {projectScope() === "file" ? "Close file" : "Close project"}
              </span>
              <Show when={closeShortcut()}>
                <kbd class="header-dropdown-shortcut">{closeShortcut()}</kbd>
              </Show>
            </button>
          </Show>
          <Show when={recentProjects().length > 0}>
            <div class="header-dropdown-divider" role="separator" />
            <div class="open-project-recent-section">
              <span class="header-dropdown-section-label">Recent</span>
              <RecentProjectsList onSelected={() => setOpen(false)} />
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
