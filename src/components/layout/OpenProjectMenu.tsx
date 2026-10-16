import { ChevronDown, FileText, FolderOpen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCommandKeybindingLabel } from "../../features/keymap/format-command-keybinding";
import { RecentProjectsList } from "../projects/RecentProjectsList";
import { useProjectStore } from "../../stores/project-store";

export function OpenProjectMenu() {
  const openProjectDialog = useProjectStore((s) => s.openProjectDialog);
  const openDbmlFileDialog = useProjectStore((s) => s.openDbmlFileDialog);
  const closeProject = useProjectStore((s) => s.closeProject);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const projectScope = useProjectStore((s) => s.projectScope);
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const closeShortcut = useCommandKeybindingLabel("project.close");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const run = (action: () => Promise<void>) => {
    setOpen(false);
    void action().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(message);
    });
  };

  return (
    <div className="header-dropdown open-project-menu" ref={wrapRef}>
      <div className="header-dropdown-trigger open-project-menu-trigger">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          title="Open folder or file"
          aria-label="Open folder or file"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <FolderOpen size={15} />
          <span className="header-btn-label">Open</span>
          <ChevronDown size={14} className="open-project-menu-chevron" />
        </button>
      </div>
      {open && (
        <div className="header-dropdown-menu open-project-menu-popover" role="menu">
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            onClick={() => run(openProjectDialog)}
          >
            <FolderOpen size={14} />
            <span className="header-dropdown-item-label">Open folder…</span>
          </button>
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            onClick={() => run(openDbmlFileDialog)}
          >
            <FileText size={14} />
            <span className="header-dropdown-item-label">Open file…</span>
          </button>
          {projectRoot && (
            <>
              <div className="header-dropdown-divider" role="separator" />
              <button
                type="button"
                className="header-dropdown-item"
                role="menuitem"
                onClick={() => run(closeProject)}
              >
                <X size={14} />
                <span className="header-dropdown-item-label">
                  {projectScope === "file" ? "Close file" : "Close folder"}
                </span>
                {closeShortcut && (
                  <span className="header-dropdown-item-hint">
                    {closeShortcut}
                  </span>
                )}
              </button>
            </>
          )}
          {recentProjects.length > 0 && (
            <>
              <p className="header-dropdown-section-label">Recent</p>
              <RecentProjectsList
                variant="compact"
                onOpened={() => setOpen(false)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
