import {
  ChevronsDownUp,
  ChevronsUpDown,
  Ellipsis,
  FolderSync,
  SearchX,
  Target,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export interface ExplorerTreeMenuProps {
  disabled?: boolean;
  canRevealActive: boolean;
  canClearFilter: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRevealActive: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
}

export function ExplorerTreeMenu({
  disabled,
  canRevealActive,
  canClearFilter,
  onExpandAll,
  onCollapseAll,
  onRevealActive,
  onClearFilter,
  onRefresh,
}: ExplorerTreeMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as HTMLElement)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="explorer-tree-menu" ref={rootRef}>
      <button
        type="button"
        className="header-btn icon-only"
        title="Tree actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <Ellipsis size={14} />
      </button>
      {open && (
        <div className="explorer-tree-menu-panel" id={menuId} role="menu">
          <button
            type="button"
            role="menuitem"
            className="explorer-tree-menu-item"
            onClick={() => run(onExpandAll)}
          >
            <ChevronsDownUp size={14} />
            Expand all folders
          </button>
          <button
            type="button"
            role="menuitem"
            className="explorer-tree-menu-item"
            onClick={() => run(onCollapseAll)}
          >
            <ChevronsUpDown size={14} />
            Collapse all folders
          </button>
          <button
            type="button"
            role="menuitem"
            className="explorer-tree-menu-item"
            disabled={!canRevealActive}
            onClick={() => run(onRevealActive)}
          >
            <Target size={14} />
            Reveal active file
          </button>
          <div className="explorer-tree-menu-separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="explorer-tree-menu-item"
            disabled={!canClearFilter}
            onClick={() => run(onClearFilter)}
          >
            <SearchX size={14} />
            Clear filter
          </button>
          <button
            type="button"
            role="menuitem"
            className="explorer-tree-menu-item"
            onClick={() => run(onRefresh)}
          >
            <FolderSync size={14} />
            Refresh file list
          </button>
        </div>
      )}
    </div>
  );
}
