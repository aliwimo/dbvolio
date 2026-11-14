import {
  Check,
  ChevronRight,
  Focus,
  FolderPlus,
  Maximize2,
  MinusCircle,
  Network,
  Pencil,
  Plus,
  Wand2,
} from "lucide-solid";
import { createSignal, onCleanup, onMount, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { LayoutScope } from "../../features/diagram-layout/layout-options";
import { useDiagramStore } from "../../stores/diagram-store";
import type { SchemaTableGroup } from "../../types/schema";
import { resolveGroupColor } from "./TableGroupNode";
import type { TableNodeData } from "./TableNode";

export interface DiagramContextMenuState {
  x: number;
  y: number;
  tableId: string | null;
}

export type AddToGroupTarget =
  | { kind: "existing"; groupId: string }
  | { kind: "new"; name: string };

const VIEWPORT_MARGIN = 8;
const EMPTY_GROUPS: SchemaTableGroup[] = [];

export function DiagramContextMenu(props: {
  state: DiagramContextMenuState;
  isRunning: boolean;
  canRun: boolean;
  canRunSelection: boolean;
  onRunLayout: (scope: LayoutScope) => void;
  onFitView: () => void;
  onFocusTable: (tableId: string) => void;
  onEditTable: (tableId: string) => void;
  onNewTable: () => void;
  onAddToGroup: (tableId: string, target: AddToGroupTarget) => void;
  onRemoveFromGroup: (tableId: string) => void;
  onClose: () => void;
}) {
  let menuRef: HTMLDivElement | undefined;
  let groupItemRef: HTMLButtonElement | undefined;
  let submenuRef: HTMLDivElement | undefined;

  const [position, setPosition] = createSignal({ x: props.state.x, y: props.state.y });
  const [submenuOpen, setSubmenuOpen] = createSignal(false);
  const [submenuPosition, setSubmenuPosition] = createSignal({ left: 0, top: 0 });
  const [creatingGroup, setCreatingGroup] = createSignal(false);
  const [groupName, setGroupName] = createSignal("");
  const [groupError, setGroupError] = createSignal<string | null>(null);

  const table = () => {
    if (!props.state.tableId) return null;
    const node = useDiagramStore.getState().nodes.find((n) => n.id === props.state.tableId);
    return (node?.data as TableNodeData | undefined)?.table ?? null;
  };

  const groups = () => useDiagramStore((s) => s.model?.tableGroups ?? EMPTY_GROUPS);
  const sortedGroups = () => [...groups()].sort((a, b) => a.name.localeCompare(b.name));
  const currentGroupId = () => table()?.groupId ?? null;

  const tableLabel = () => {
    if (!props.state.tableId) return null;
    const t = table();
    return t ? (t.schema ? `${t.schema}.${t.name}` : t.name) : props.state.tableId;
  };

  const updateMenuPosition = () => {
    if (!menuRef) return;
    const rect = menuRef.getBoundingClientRect();
    setPosition({
      x: Math.max(
        VIEWPORT_MARGIN,
        Math.min(props.state.x, window.innerWidth - rect.width - VIEWPORT_MARGIN)
      ),
      y: Math.max(
        VIEWPORT_MARGIN,
        Math.min(props.state.y, window.innerHeight - rect.height - VIEWPORT_MARGIN)
      ),
    });
  };

  const updateSubmenuPosition = () => {
    if (!groupItemRef || !submenuRef) return;
    const triggerRect = groupItemRef.getBoundingClientRect();
    const submenuRect = submenuRef.getBoundingClientRect();
    const gap = 4;
    let left = triggerRect.right + gap;
    if (left + submenuRect.width > window.innerWidth - VIEWPORT_MARGIN) {
      left = triggerRect.left - submenuRect.width - gap;
    }
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, window.innerWidth - submenuRect.width - VIEWPORT_MARGIN)
    );
    let top = triggerRect.top;
    if (top + submenuRect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(
        VIEWPORT_MARGIN,
        window.innerHeight - submenuRect.height - VIEWPORT_MARGIN
      );
    }
    setSubmenuPosition({ left, top });
  };

  onMount(() => {
    setTimeout(updateMenuPosition, 0);

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef?.contains(target) && !submenuRef?.contains(target)) {
        props.onClose();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", props.onClose);
    window.addEventListener("resize", props.onClose);

    onCleanup(() => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", props.onClose);
      window.removeEventListener("resize", props.onClose);
    });
  });

  const run = (action: () => void) => {
    action();
    props.onClose();
  };

  const openNewGroup = () => {
    setCreatingGroup(true);
    setGroupName(`${table()?.name ?? "group"}_group`);
    setGroupError(null);
  };

  const submitNewGroup = (event: SubmitEvent) => {
    event.preventDefault();
    if (!props.state.tableId) return;
    const name = groupName().trim();
    if (!name) {
      setGroupError("Enter a group name.");
      return;
    }
    if (name.includes(".") || /[{}]/.test(name)) {
      setGroupError("Group names can't contain ., { or }.");
      return;
    }
    if (sortedGroups().some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      setGroupError("A group with this name already exists.");
      return;
    }
    run(() => props.onAddToGroup(props.state.tableId!, { kind: "new", name }));
  };

  const toggleSubmenu = () => {
    const next = !submenuOpen();
    setSubmenuOpen(next);
    setCreatingGroup(false);
    setGroupError(null);
    if (next) {
      setTimeout(updateSubmenuPosition, 0);
    }
  };

  return (
    <Portal>
      <div
        ref={menuRef}
        class="diagram-context-menu"
        style={{ left: `${position().x}px`, top: `${position().y}px` }}
        role="menu"
        aria-label="Diagram actions"
        onContextMenu={(event) => event.preventDefault()}
      >
        <Show when={props.state.tableId && tableLabel()}>
          <div class="diagram-context-menu-label" title={tableLabel() ?? ""}>
            {tableLabel()}
          </div>
          <button
            type="button"
            role="menuitem"
            class="diagram-context-menu-item"
            onClick={() => run(() => props.onEditTable(props.state.tableId!))}
          >
            <Pencil size={14} />
            Edit table
          </button>
          <button
            type="button"
            role="menuitem"
            class="diagram-context-menu-item"
            onClick={() => run(() => props.onFocusTable(props.state.tableId!))}
          >
            <Focus size={14} />
            Focus table
          </button>
          <button
            ref={groupItemRef}
            type="button"
            role="menuitem"
            class={`diagram-context-menu-item ${submenuOpen() ? "active" : ""}`}
            aria-haspopup="menu"
            aria-expanded={submenuOpen()}
            onClick={toggleSubmenu}
          >
            <FolderPlus size={14} />
            Add to group
            <ChevronRight size={14} class="diagram-context-menu-chevron" />
          </button>
          <button
            type="button"
            role="menuitem"
            class="diagram-context-menu-item"
            disabled={!props.canRunSelection || props.isRunning}
            onClick={() => run(() => props.onRunLayout("selection"))}
          >
            <Network size={14} />
            Arrange related cluster
          </button>
          <div class="diagram-context-menu-separator" role="separator" />
        </Show>

        <Show when={!props.state.tableId}>
          <button
            type="button"
            role="menuitem"
            class="diagram-context-menu-item"
            onClick={() => run(props.onNewTable)}
          >
            <Plus size={14} />
            New table
          </button>
          <div class="diagram-context-menu-separator" role="separator" />
        </Show>

        <button
          type="button"
          role="menuitem"
          class="diagram-context-menu-item"
          disabled={!props.canRun || props.isRunning}
          onClick={() => run(() => props.onRunLayout("all"))}
        >
          <Wand2 size={14} />
          {props.isRunning ? "Arranging…" : "Auto-arrange all"}
        </button>
        <button
          type="button"
          role="menuitem"
          class="diagram-context-menu-item"
          onClick={() => run(props.onFitView)}
        >
          <Maximize2 size={14} />
          Fit view
        </button>

        <Show when={submenuOpen() && props.state.tableId}>
          <Portal>
            <div
              ref={submenuRef}
              class="diagram-context-menu diagram-context-submenu"
              style={{
                left: `${submenuPosition().left}px`,
                top: `${submenuPosition().top}px`,
              }}
              role="menu"
              aria-label="Add to group"
              onContextMenu={(event) => event.preventDefault()}
            >
              <Show
                when={!creatingGroup()}
                fallback={
                  <form
                    class="diagram-context-menu-group-form"
                    onSubmit={submitNewGroup}
                  >
                    <label
                      class="diagram-context-menu-label"
                      for="diagram-new-group-name"
                    >
                      New group
                    </label>
                    <input
                      id="diagram-new-group-name"
                      class="diagram-context-menu-group-input"
                      value={groupName()}
                      autofocus
                      onInput={(event) => {
                        setGroupName(event.currentTarget.value);
                        setGroupError(null);
                      }}
                    />
                    <Show when={groupError()}>
                      <p class="diagram-context-menu-group-error">
                        {groupError()}
                      </p>
                    </Show>
                    <div class="diagram-context-menu-group-actions">
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost"
                        onClick={() => {
                          setCreatingGroup(false);
                          setGroupError(null);
                        }}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        class="btn btn-sm btn-primary"
                        disabled={!groupName().trim()}
                      >
                        Create &amp; add
                      </button>
                    </div>
                  </form>
                }
              >
                <Show when={sortedGroups().length === 0}>
                  <p class="diagram-context-menu-empty">No groups yet</p>
                </Show>
                <For each={sortedGroups()}>
                  {(group) => {
                    const isCurrent = () => group.id === currentGroupId();
                    return (
                      <button
                        type="button"
                        role="menuitem"
                        class="diagram-context-menu-item"
                        disabled={isCurrent()}
                        onClick={() =>
                          run(() =>
                            props.onAddToGroup(props.state.tableId!, {
                              kind: "existing",
                              groupId: group.id,
                            })
                          )
                        }
                      >
                        <span
                          class="diagram-context-group-swatch"
                          style={{ background: resolveGroupColor(group) }}
                          aria-hidden
                        />
                        <span class="diagram-context-group-name">
                          {group.schema
                            ? `${group.schema}.${group.name}`
                            : group.name}
                        </span>
                        <Show when={isCurrent()}>
                          <Check size={14} />
                        </Show>
                      </button>
                    );
                  }}
                </For>
                <Show when={currentGroupId()}>
                  <div
                    class="diagram-context-menu-separator"
                    role="separator"
                  />
                  <button
                    type="button"
                    role="menuitem"
                    class="diagram-context-menu-item"
                    onClick={() =>
                      run(() => props.onRemoveFromGroup(props.state.tableId!))
                    }
                  >
                    <MinusCircle size={14} />
                    Remove from group
                  </button>
                </Show>
                <div class="diagram-context-menu-separator" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  class="diagram-context-menu-item"
                  onClick={openNewGroup}
                >
                  <Plus size={14} />
                  New group…
                </button>
              </Show>
            </div>
          </Portal>
        </Show>
      </div>
    </Portal>
  );
}
