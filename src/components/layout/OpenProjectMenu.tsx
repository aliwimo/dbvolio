import { ChevronDown, FolderOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RecentProjectsList } from "../projects/RecentProjectsList";
import { useProjectStore } from "../../stores/project-store";

export function OpenProjectMenu() {
  const openProjectDialog = useProjectStore((s) => s.openProjectDialog);
  const recentProjects = useProjectStore((s) => s.recentProjects);
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

  const openFolder = () => {
    setOpen(false);
    void openProjectDialog();
  };

  return (
    <div className="header-dropdown open-project-menu" ref={wrapRef}>
      <div className="header-dropdown-trigger open-project-menu-trigger">
        <button type="button" className="btn btn-ghost btn-sm" onClick={openFolder}>
          <FolderOpen size={15} />
          Open
        </button>
        {recentProjects.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm open-project-menu-caret"
            aria-expanded={open}
            aria-label="Recent projects"
            title="Recent projects"
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown size={14} />
          </button>
        )}
      </div>
      {open && recentProjects.length > 0 && (
        <div className="header-dropdown-menu open-project-menu-popover" role="menu">
          <p className="header-dropdown-section-label">Recent</p>
          <RecentProjectsList
            variant="compact"
            onOpened={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
