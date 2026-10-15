import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Focus,
  LayoutGrid,
  Network,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LayoutScope } from "../../features/diagram-layout/layout-options";
import {
  useDiagramViewStore,
  type LayoutDirection,
  type LayoutSpacing,
} from "../../stores/diagram-view-store";

const DIRECTIONS: {
  value: LayoutDirection;
  label: string;
  icon: typeof ArrowRight;
}[] = [
  { value: "LR", label: "Left to right", icon: ArrowRight },
  { value: "TB", label: "Top to bottom", icon: ArrowDown },
  { value: "RL", label: "Right to left", icon: ArrowLeft },
  { value: "BT", label: "Bottom to top", icon: ArrowUp },
];

const SPACING: { value: LayoutSpacing; label: string; hint: string }[] = [
  { value: "compact", label: "Compact", hint: "Tighter tables" },
  { value: "default", label: "Default", hint: "Balanced spacing" },
  { value: "relaxed", label: "Relaxed", hint: "More room" },
];

export function LayoutMenu({
  isRunning,
  canRun,
  canRunSelection,
  onRunLayout,
  onFitView,
}: {
  isRunning: boolean;
  canRun: boolean;
  canRunSelection: boolean;
  onRunLayout: (scope: LayoutScope) => void;
  onFitView: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const layoutDirection = useDiagramViewStore((s) => s.layoutDirection);
  const layoutSpacing = useDiagramViewStore((s) => s.layoutSpacing);
  const layoutFitView = useDiagramViewStore((s) => s.layoutFitView);
  const layoutSeparateComponents = useDiagramViewStore(
    (s) => s.layoutSeparateComponents,
  );
  const setOption = useDiagramViewStore((s) => s.setOption);
  const toggleOption = useDiagramViewStore((s) => s.toggleOption);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const run = (scope: LayoutScope) => {
    setMenuOpen(false);
    onRunLayout(scope);
  };

  return (
    <div className="diagram-layout-menu-wrap" ref={wrapRef}>
      <div className="header-dropdown-trigger diagram-layout-trigger">
        <button
          type="button"
          className="btn btn-sm diagram-layout-main"
          disabled={!canRun || isRunning}
          title="Auto layout all tables"
          onClick={() => run("all")}
        >
          <LayoutGrid size={14} />
          {isRunning ? "Layout…" : "Layout"}
        </button>
        <button
          type="button"
          className="btn btn-sm diagram-layout-caret"
          disabled={!canRun}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Layout options"
          title="Layout options"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {menuOpen && (
        <div
          className="diagram-layout-dropdown"
          role="menu"
          aria-label="Layout options"
        >
          <p className="header-dropdown-section-label">Run</p>
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            disabled={!canRun || isRunning}
            onClick={() => run("all")}
          >
            <LayoutGrid size={15} />
            <span>
              <span className="header-dropdown-item-label">Auto layout all</span>
              <span className="header-dropdown-item-hint">
                Rearrange every table on the canvas
              </span>
            </span>
          </button>
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            disabled={!canRunSelection || isRunning}
            onClick={() => run("selection")}
          >
            <Network size={15} />
            <span>
              <span className="header-dropdown-item-label">
                Layout related cluster
              </span>
              <span className="header-dropdown-item-hint">
                Selected table and its direct relationships
              </span>
            </span>
          </button>
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onFitView();
            }}
          >
            <Focus size={15} />
            <span>
              <span className="header-dropdown-item-label">Fit view</span>
              <span className="header-dropdown-item-hint">
                Zoom to show the full diagram
              </span>
            </span>
          </button>

          <div className="diagram-layout-dropdown-divider" />

          <p className="header-dropdown-section-label">Direction</p>
          <div className="diagram-layout-direction-grid" role="group">
            {DIRECTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={`diagram-layout-direction-btn ${layoutDirection === value ? "active" : ""}`}
                title={label}
                aria-pressed={layoutDirection === value}
                onClick={() => setOption("layoutDirection", value)}
              >
                <Icon size={14} />
                <span>{value}</span>
              </button>
            ))}
          </div>

          <div className="diagram-layout-dropdown-divider" />

          <p className="header-dropdown-section-label">Spacing</p>
          <div className="diagram-layout-spacing-list" role="radiogroup">
            {SPACING.map(({ value, label, hint }) => (
              <label key={value} className="diagram-layout-radio-row">
                <input
                  type="radio"
                  name="layout-spacing"
                  checked={layoutSpacing === value}
                  onChange={() => setOption("layoutSpacing", value)}
                />
                <span>
                  <span className="header-dropdown-item-label">{label}</span>
                  <span className="header-dropdown-item-hint">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="diagram-layout-dropdown-divider" />

          <p className="header-dropdown-section-label">Options</p>
          <label className="diagram-option-row">
            <input
              type="checkbox"
              checked={layoutFitView}
              onChange={() => toggleOption("layoutFitView")}
            />
            <span>Fit view after layout</span>
          </label>
          <label className="diagram-option-row">
            <input
              type="checkbox"
              checked={layoutSeparateComponents}
              onChange={() => toggleOption("layoutSeparateComponents")}
            />
            <span>Layout disconnected groups separately</span>
          </label>
        </div>
      )}
    </div>
  );
}
