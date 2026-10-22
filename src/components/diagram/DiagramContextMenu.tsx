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
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

export function DiagramContextMenu({
  state,
  isRunning,
  canRun,
  canRunSelection,
  onRunLayout,
  onFitView,
  onFocusTable,
  onEditTable,
  onNewTable,
  onAddToGroup,
  onRemoveFromGroup,
  onClose,
}: {
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
  const menuRef = useRef<HTMLDivElement>(null);
  const groupItemRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: state.x, y: state.y });
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({ left: 0, top: 0 });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupError, setGroupError] = useState<string | null>(null);

  const table = useDiagramStore((s) => {
    if (!state.tableId) {
      return null;
    }
    const node = s.nodes.find((n) => n.id === state.tableId);
    return (node?.data as TableNodeData | undefined)?.table ?? null;
  });
  const groups = useDiagramStore((s) => s.model?.tableGroups ?? EMPTY_GROUPS);
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );
  const currentGroupId = table?.groupId ?? null;

  const tableLabel = state.tableId
    ? table
      ? table.schema
        ? `${table.schema}.${table.name}`
        : table.name
      : state.tableId
    : null;

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setPosition({
      x: Math.max(
        VIEWPORT_MARGIN,
        Math.min(state.x, window.innerWidth - rect.width - VIEWPORT_MARGIN),
      ),
      y: Math.max(
        VIEWPORT_MARGIN,
        Math.min(state.y, window.innerHeight - rect.height - VIEWPORT_MARGIN),
      ),
    });
  }, [state.x, state.y]);

  useEffect(() => {
    setSubmenuOpen(false);
    setCreatingGroup(false);
    setGroupName("");
    setGroupError(null);
  }, [state.x, state.y, state.tableId]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !submenuRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!submenuOpen) {
      return;
    }
    const trigger = groupItemRef.current;
    const submenu = submenuRef.current;
    if (!trigger || !submenu) {
      return;
    }
    const triggerRect = trigger.getBoundingClientRect();
    const submenuRect = submenu.getBoundingClientRect();
    const gap = 4;
    let left = triggerRect.right + gap;
    if (left + submenuRect.width > window.innerWidth - VIEWPORT_MARGIN) {
      left = triggerRect.left - submenuRect.width - gap;
    }
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, window.innerWidth - submenuRect.width - VIEWPORT_MARGIN),
    );
    let top = triggerRect.top;
    if (top + submenuRect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = Math.max(
        VIEWPORT_MARGIN,
        window.innerHeight - submenuRect.height - VIEWPORT_MARGIN,
      );
    }
    setSubmenuPosition({ left, top });
  }, [submenuOpen, creatingGroup, sortedGroups.length]);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  const openNewGroup = () => {
    setCreatingGroup(true);
    setGroupName(`${table?.name ?? "group"}_group`);
    setGroupError(null);
  };

  const submitNewGroup = (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.tableId) {
      return;
    }
    const name = groupName.trim();
    if (!name) {
      setGroupError("Enter a group name.");
      return;
    }
    if (name.includes(".") || /[{}]/.test(name)) {
      setGroupError("Group names can't contain ., { or }.");
      return;
    }
    if (
      sortedGroups.some(
        (group) => group.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setGroupError("A group with this name already exists.");
      return;
    }
    run(() => onAddToGroup(state.tableId!, { kind: "new", name }));
  };

  return createPortal(
    <div
      ref={menuRef}
      className="diagram-context-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Diagram actions"
      onContextMenu={(event) => event.preventDefault()}
    >
      {state.tableId && tableLabel && (
        <>
          <div className="diagram-context-menu-label" title={tableLabel}>
            {tableLabel}
          </div>
          <button
            type="button"
            role="menuitem"
            className="diagram-context-menu-item"
            onClick={() => run(() => onEditTable(state.tableId!))}
          >
            <Pencil size={14} />
            Edit table
          </button>
          <button
            type="button"
            role="menuitem"
            className="diagram-context-menu-item"
            onClick={() => run(() => onFocusTable(state.tableId!))}
          >
            <Focus size={14} />
            Focus table
          </button>
          <button
            ref={groupItemRef}
            type="button"
            role="menuitem"
            className={`diagram-context-menu-item ${submenuOpen ? "active" : ""}`}
            aria-haspopup="menu"
            aria-expanded={submenuOpen}
            onClick={() => {
              setSubmenuOpen((open) => !open);
              setCreatingGroup(false);
              setGroupError(null);
            }}
          >
            <FolderPlus size={14} />
            Add to group
            <ChevronRight
              size={14}
              className="diagram-context-menu-chevron"
            />
          </button>
          <button
            type="button"
            role="menuitem"
            className="diagram-context-menu-item"
            disabled={!canRunSelection || isRunning}
            onClick={() => run(() => onRunLayout("selection"))}
          >
            <Network size={14} />
            Arrange related cluster
          </button>
          <div className="diagram-context-menu-separator" role="separator" />
        </>
      )}

      {!state.tableId && (
        <>
          <button
            type="button"
            role="menuitem"
            className="diagram-context-menu-item"
            onClick={() => run(onNewTable)}
          >
            <Plus size={14} />
            New table
          </button>
          <div className="diagram-context-menu-separator" role="separator" />
        </>
      )}

      <button
        type="button"
        role="menuitem"
        className="diagram-context-menu-item"
        disabled={!canRun || isRunning}
        onClick={() => run(() => onRunLayout("all"))}
      >
        <Wand2 size={14} />
        {isRunning ? "Arranging…" : "Auto-arrange all"}
      </button>
      <button
        type="button"
        role="menuitem"
        className="diagram-context-menu-item"
        onClick={() => run(onFitView)}
      >
        <Maximize2 size={14} />
        Fit view
      </button>

      {submenuOpen &&
        state.tableId &&
        createPortal(
          <div
            ref={submenuRef}
            className="diagram-context-menu diagram-context-submenu"
            style={{ left: submenuPosition.left, top: submenuPosition.top }}
            role="menu"
            aria-label="Add to group"
            onContextMenu={(event) => event.preventDefault()}
          >
            {creatingGroup ? (
              <form
                className="diagram-context-menu-group-form"
                onSubmit={submitNewGroup}
              >
                <label
                  className="diagram-context-menu-label"
                  htmlFor="diagram-new-group-name"
                >
                  New group
                </label>
                <input
                  id="diagram-new-group-name"
                  className="diagram-context-menu-group-input"
                  value={groupName}
                  autoFocus
                  onChange={(event) => {
                    setGroupName(event.target.value);
                    setGroupError(null);
                  }}
                />
                {groupError && (
                  <p className="diagram-context-menu-group-error">
                    {groupError}
                  </p>
                )}
                <div className="diagram-context-menu-group-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setCreatingGroup(false);
                      setGroupError(null);
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={!groupName.trim()}
                  >
                    Create &amp; add
                  </button>
                </div>
              </form>
            ) : (
              <>
                {sortedGroups.length === 0 && (
                  <p className="diagram-context-menu-empty">No groups yet</p>
                )}
                {sortedGroups.map((group) => {
                  const isCurrent = group.id === currentGroupId;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      role="menuitem"
                      className="diagram-context-menu-item"
                      disabled={isCurrent}
                      onClick={() =>
                        run(() =>
                          onAddToGroup(state.tableId!, {
                            kind: "existing",
                            groupId: group.id,
                          }),
                        )
                      }
                    >
                      <span
                        className="diagram-context-group-swatch"
                        style={{ background: resolveGroupColor(group) }}
                        aria-hidden
                      />
                      <span className="diagram-context-group-name">
                        {group.schema
                          ? `${group.schema}.${group.name}`
                          : group.name}
                      </span>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
                {currentGroupId && (
                  <>
                    <div
                      className="diagram-context-menu-separator"
                      role="separator"
                    />
                    <button
                      type="button"
                      role="menuitem"
                      className="diagram-context-menu-item"
                      onClick={() =>
                        run(() => onRemoveFromGroup(state.tableId!))
                      }
                    >
                      <MinusCircle size={14} />
                      Remove from group
                    </button>
                  </>
                )}
                <div
                  className="diagram-context-menu-separator"
                  role="separator"
                />
                <button
                  type="button"
                  role="menuitem"
                  className="diagram-context-menu-item"
                  onClick={openNewGroup}
                >
                  <Plus size={14} />
                  New group…
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>,
    document.body,
  );
}
