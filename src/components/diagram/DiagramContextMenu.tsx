import {
  Focus,
  Maximize2,
  Network,
  Pencil,
  Plus,
  Wand2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LayoutScope } from "../../features/diagram-layout/layout-options";
import { useDiagramStore } from "../../stores/diagram-store";
import type { TableNodeData } from "./TableNode";

export interface DiagramContextMenuState {
  x: number;
  y: number;
  tableId: string | null;
}

const VIEWPORT_MARGIN = 8;

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
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: state.x, y: state.y });

  const tableLabel = useDiagramStore((s) => {
    if (!state.tableId) {
      return null;
    }
    const node = s.nodes.find((n) => n.id === state.tableId);
    const table = (node?.data as TableNodeData | undefined)?.table;
    if (!table) {
      return state.tableId;
    }
    return table.schema ? `${table.schema}.${table.name}` : table.name;
  });

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
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
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

  const run = (action: () => void) => {
    action();
    onClose();
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
    </div>,
    document.body,
  );
}
