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
  let rootRef: HTMLDivElement | undefined;

  onMount(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!open()) return;
      if (!rootRef?.contains(event.target as HTMLElement)) {
        setOpen(false);
      }
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
    <div class="explorer-menu-root" ref={rootRef}>
      <button
        type="button"
        class={`btn-icon explorer-menu-trigger ${open() ? "active" : ""}`}
        disabled={props.disabled}
        aria-label="Explorer actions"
        title="Explorer actions"
        aria-expanded={open()}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Ellipsis size={14} />
      </button>

      <Show when={open()}>
        <div class="explorer-menu-popover" role="menu">
          <Show when={props.canRevealActive}>
            <button
              type="button"
              role="menuitem"
              class="explorer-menu-item"
              onClick={() => run(props.onRevealActive)}
            >
              <Target size={14} />
              <span>Reveal active file</span>
            </button>
          </Show>

          <button
            type="button"
            role="menuitem"
            class="explorer-menu-item"
            onClick={() => run(props.onExpandAll)}
          >
            <ChevronsUpDown size={14} />
            <span>Expand all</span>
          </button>

          <button
            type="button"
            role="menuitem"
            class="explorer-menu-item"
            onClick={() => run(props.onCollapseAll)}
          >
            <ChevronsDownUp size={14} />
            <span>Collapse all</span>
          </button>

          <Show when={props.canClearFilter}>
            <button
              type="button"
              role="menuitem"
              class="explorer-menu-item"
              onClick={() => run(props.onClearFilter)}
            >
              <SearchX size={14} />
              <span>Clear filter</span>
            </button>
          </Show>

          <div class="explorer-menu-divider" role="separator" />

          <button
            type="button"
            role="menuitem"
            class="explorer-menu-item"
            onClick={() => run(props.onRefresh)}
          >
            <FolderSync size={14} />
            <span>Refresh files</span>
          </button>

          <button
            type="button"
            role="menuitem"
            class="explorer-menu-item"
            onClick={() => run(props.onToggleShowAllFiles)}
          >
            <Files size={14} />
            <span>
              {props.showAllFiles ? "Show only DBML files" : "Show all files"}
            </span>
          </button>

          <Show when={props.canUseForDiagram || props.canRename || props.canDelete}>
            <div class="explorer-menu-divider" role="separator" />
          </Show>

          <Show when={props.canUseForDiagram}>
            <button
              type="button"
              role="menuitem"
              class="explorer-menu-item"
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
              class="explorer-menu-item"
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
              class="explorer-menu-item explorer-menu-item-danger"
              onClick={() => run(props.onDelete)}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </Show>
        </div>
      </Show>
    </div>
  );
}
