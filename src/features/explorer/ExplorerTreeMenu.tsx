import {
  ChevronsDownUp,
  ChevronsUpDown,
  Ellipsis,
  Files,
  FolderSync,
  Pencil,
  SearchX,
  Target,
  Trash2,
} from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";

export interface ExplorerTreeMenuProps {
  disabled?: boolean;
  canRevealActive: boolean;
  canClearFilter: boolean;
  showAllFiles: boolean;
  canRename: boolean;
  canDelete: boolean;
  canUseForDiagram: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRevealActive: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
  onToggleShowAllFiles: () => void;
  onRename: () => void;
  onDelete: () => void;
  onUseForDiagram: () => void;
}

export function ExplorerTreeMenu(props: ExplorerTreeMenuProps) {
  const [open, setOpen] = createSignal(false);
  const [menuPos, setMenuPos] = createSignal({ top: 0, left: 0 });
  let rootRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const placeMenu = () => {
    const rect = rootRef?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ top: rect.bottom + 4, left: rect.right });
  };

  onMount(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!open()) return;
      const target = event.target as HTMLElement;
      if (rootRef?.contains(target) || menuRef?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open()) return;
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    });
  });

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div class="explorer-tree-menu" ref={rootRef}>
      <button
        type="button"
        class={`btn-icon btn-icon-xs ${open() ? "active" : ""}`}
        disabled={props.disabled}
        aria-label="Explorer actions"
        title="Explorer actions"
        aria-expanded={open()}
        onClick={() => {
          if (open()) {
            setOpen(false);
            return;
          }
          placeMenu();
          setOpen(true);
        }}
      >
        <Ellipsis size={14} />
      </button>

      <Show when={open()}>
        <Portal>
        <div
          class="explorer-tree-menu-panel"
          role="menu"
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${menuPos().top}px`,
            left: `${menuPos().left}px`,
            right: "auto",
            width: "220px",
            transform: "translateX(-100%)",
          }}
        >
          <Show when={props.canRevealActive}>
            <button
              type="button"
              role="menuitem"
              class="explorer-tree-menu-item"
              onClick={() => run(props.onRevealActive)}
            >
              <Target size={14} />
              <span>Reveal active file</span>
            </button>
          </Show>

          <button
            type="button"
            role="menuitem"
            class="explorer-tree-menu-item"
            onClick={() => run(props.onExpandAll)}
          >
            <ChevronsUpDown size={14} />
            <span>Expand all</span>
          </button>

          <button
            type="button"
            role="menuitem"
            class="explorer-tree-menu-item"
            onClick={() => run(props.onCollapseAll)}
          >
            <ChevronsDownUp size={14} />
            <span>Collapse all</span>
          </button>

          <Show when={props.canClearFilter}>
            <button
              type="button"
              role="menuitem"
              class="explorer-tree-menu-item"
              onClick={() => run(props.onClearFilter)}
            >
              <SearchX size={14} />
              <span>Clear filter</span>
            </button>
          </Show>

          <div class="explorer-tree-menu-separator" role="separator" />

          <button
            type="button"
            role="menuitem"
            class="explorer-tree-menu-item"
            onClick={() => run(props.onRefresh)}
          >
            <FolderSync size={14} />
            <span>Refresh files</span>
          </button>

          <button
            type="button"
            role="menuitem"
            class="explorer-tree-menu-item"
            onClick={() => run(props.onToggleShowAllFiles)}
          >
            <Files size={14} />
            <span>
              {props.showAllFiles ? "Show only DBML files" : "Show all files"}
            </span>
          </button>

          <Show when={props.canUseForDiagram || props.canRename || props.canDelete}>
            <div class="explorer-tree-menu-separator" role="separator" />
          </Show>

          <Show when={props.canUseForDiagram}>
            <button
              type="button"
              role="menuitem"
              class="explorer-tree-menu-item"
              onClick={() => run(props.onUseForDiagram)}
            >
              <Target size={14} />
              <span>Use as diagram root</span>
            </button>
          </Show>

          <Show when={props.canRename}>
            <button
              type="button"
              role="menuitem"
              class="explorer-tree-menu-item"
              onClick={() => run(props.onRename)}
            >
              <Pencil size={14} />
              <span>Rename</span>
            </button>
          </Show>

          <Show when={props.canDelete}>
            <button
              type="button"
              role="menuitem"
              class="explorer-tree-menu-item explorer-tree-menu-danger"
              onClick={() => run(props.onDelete)}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </Show>
        </div>
        </Portal>
      </Show>
    </div>
  );
}
