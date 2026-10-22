import {
  ChevronRight,
  Focus,
  Grid3x3,
  Layers,
  Network,
  Orbit,
  Waypoints,
  Wand2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LayoutScope } from "../../features/diagram-layout/layout-options";
import { LAYOUT_PRESET_COPY } from "../../features/diagram-layout/layout-preset-copy";
import {
  useDiagramViewStore,
  type LayoutAlgorithm,
  type LayoutSpacing,
} from "../../stores/diagram-view-store";

const SPACING: { value: LayoutSpacing; label: string; hint: string }[] = [
  { value: "compact", label: "Compact", hint: "Tighter gaps between tables" },
  { value: "default", label: "Default", hint: "Balanced spacing" },
  { value: "relaxed", label: "Relaxed", hint: "Extra room between tables" },
];

const PRESET_ICONS: Record<LayoutAlgorithm, typeof Waypoints> = {
  "left-right": Waypoints,
  pipeline: Layers,
  snowflake: Orbit,
  compact: Grid3x3,
};

const PRESETS: {
  value: LayoutAlgorithm;
  label: string;
  hint: string;
  shortcut: string;
  icon: typeof Waypoints;
}[] = (
  ["left-right", "pipeline", "snowflake", "compact"] as LayoutAlgorithm[]
).map((value, index) => ({
  value,
  label: LAYOUT_PRESET_COPY[value].label,
  hint: LAYOUT_PRESET_COPY[value].description,
  shortcut: String(index + 1),
  icon: PRESET_ICONS[value],
}));

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
  onRunLayout: (scope: LayoutScope, algorithm?: LayoutAlgorithm) => void;
  onFitView: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const layoutAlgorithm = useDiagramViewStore((s) => s.layoutAlgorithm);
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
      const target = e.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const preset = PRESETS.find((p) => p.shortcut === e.key);
      if (preset && canRun && !isRunning) {
        e.preventDefault();
        runPreset(preset.value);
      }
    };
    const onResize = () => setMenuOpen(false);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen, canRun, isRunning]);

  const runPreset = (algorithm: LayoutAlgorithm) => {
    setOption("layoutAlgorithm", algorithm);
    setMenuOpen(false);
    onRunLayout("all", algorithm);
  };

  const run = (scope: LayoutScope) => {
    setMenuOpen(false);
    onRunLayout(scope);
  };

  const applyOption = (apply: () => void) => {
    apply();
    if (canRun && !isRunning) {
      onRunLayout("all");
    }
  };

  useLayoutEffect(() => {
    if (!menuOpen) {
      return;
    }
    const trigger = wrapRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) {
      return;
    }
    const margin = 8;
    const gap = 6;
    const triggerRect = trigger.getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();
    const left = Math.max(
      margin,
      Math.min(triggerRect.left, window.innerWidth - width - margin),
    );
    const below = triggerRect.bottom + gap;
    const fitsBelow = below + height <= window.innerHeight - margin;
    const above = triggerRect.top - height - gap;
    const top = fitsBelow
      ? below
      : above >= margin
        ? above
        : Math.max(margin, window.innerHeight - height - margin);
    setMenuPosition({ left, top });
  }, [menuOpen]);

  const activePreset = PRESETS.find((p) => p.value === layoutAlgorithm);
  const activeSpacing = SPACING.find((s) => s.value === layoutSpacing);

  return (
    <div className="diagram-layout-menu-wrap" ref={wrapRef}>
      <div className="header-dropdown-trigger diagram-layout-trigger">
        <button
          type="button"
          className="btn btn-sm diagram-layout-main"
          disabled={!canRun || isRunning}
          title="Auto-arrange all tables"
          onClick={() => run("all")}
        >
          <Wand2 size={14} />
          {isRunning ? "Arranging…" : "Arrange"}
        </button>
        <button
          type="button"
          className="btn btn-sm diagram-layout-caret"
          disabled={!canRun}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Auto-arrange options"
          title={
            activePreset
              ? `Auto-arrange: ${activePreset.label}`
              : "Auto-arrange options"
          }
          onClick={() => setMenuOpen((open) => !open)}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="diagram-layout-dropdown diagram-layout-dropdown-wide"
            style={{ left: menuPosition.left, top: menuPosition.top }}
            role="menu"
            aria-label="Auto-arrange"
          >
          <p className="header-dropdown-section-label">Auto-arrange</p>
          {PRESETS.map(({ value, label, hint, shortcut, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`header-dropdown-item diagram-arrange-preset ${layoutAlgorithm === value ? "active" : ""}`}
              role="menuitem"
              disabled={!canRun || isRunning}
              onClick={() => runPreset(value)}
            >
              <Icon size={16} />
              <span className="diagram-arrange-preset-body">
                <span className="diagram-arrange-preset-title">
                  <span className="header-dropdown-item-label">{label}</span>
                  <kbd className="diagram-arrange-shortcut">{shortcut}</kbd>
                </span>
                <span className="header-dropdown-item-hint">{hint}</span>
              </span>
            </button>
          ))}

          <div className="diagram-layout-dropdown-divider" />

          <p className="header-dropdown-section-label">Spacing</p>
          <div
            className="diagram-layout-spacing-segment"
            role="radiogroup"
            aria-label="Table spacing"
          >
            {SPACING.map(({ value, label, hint }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={layoutSpacing === value}
                title={hint}
                className={`diagram-layout-spacing-btn ${layoutSpacing === value ? "active" : ""}`}
                onClick={() =>
                  applyOption(() => setOption("layoutSpacing", value))
                }
              >
                {label}
              </button>
            ))}
          </div>
          {activeSpacing && (
            <p className="diagram-layout-spacing-caption">{activeSpacing.hint}</p>
          )}

          <div className="diagram-layout-dropdown-divider" />

          <p className="header-dropdown-section-label">More</p>
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

          <p className="header-dropdown-section-label">Options</p>
          <label className="diagram-option-row">
            <input
              type="checkbox"
              checked={layoutFitView}
              onChange={() => toggleOption("layoutFitView")}
            />
            <span>Fit view after arrange</span>
          </label>
          <label className="diagram-option-row">
            <input
              type="checkbox"
              checked={layoutSeparateComponents}
              onChange={() =>
                applyOption(() => toggleOption("layoutSeparateComponents"))
              }
            />
            <span>Arrange disconnected groups separately</span>
          </label>
          </div>,
          document.body,
        )}
    </div>
  );
}
