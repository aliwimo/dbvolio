import {
  ChevronRight,
  Focus,
  Grid3x3,
  Layers,
  Network,
  Orbit,
  Waypoints,
  Wand2,
} from "lucide-solid";
import { createSignal, onCleanup, onMount, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { LayoutScope } from "../diagram-layout/layout-options";
import { LAYOUT_PRESET_COPY } from "../diagram-layout/layout-preset-copy";
import {
  useDiagramViewStore,
  type LayoutAlgorithm,
  type LayoutSpacing,
} from "./diagram-view-store";
import { Checkbox } from "../../shared/ui";

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

export function LayoutMenu(props: {
  isRunning: boolean;
  canRun: boolean;
  canRunSelection: boolean;
  onRunLayout: (scope: LayoutScope, algorithm?: LayoutAlgorithm) => void;
  onFitView: () => void;
}) {
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ left: 0, top: 0 });
  let wrapRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const layoutAlgorithm = () => useDiagramViewStore((s) => s.layoutAlgorithm);
  const layoutSpacing = () => useDiagramViewStore((s) => s.layoutSpacing);
  const layoutFitView = () => useDiagramViewStore((s) => s.layoutFitView);
  const layoutSeparateComponents = () =>
    useDiagramViewStore((s) => s.layoutSeparateComponents);
  const setOption = useDiagramViewStore.getState().setOption;
  const toggleOption = useDiagramViewStore.getState().toggleOption;

  const updatePosition = () => {
    if (!wrapRef || !menuRef) return;
    const margin = 8;
    const gap = 6;
    const triggerRect = wrapRef.getBoundingClientRect();
    const { width, height } = menuRef.getBoundingClientRect();
    const left = Math.max(
      margin,
      Math.min(triggerRect.left, window.innerWidth - width - margin)
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
  };

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuOpen()) return;
      const target = e.target as Node;
      if (wrapRef?.contains(target) || menuRef?.contains(target)) return;
      setMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!menuOpen()) return;
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const preset = PRESETS.find((p) => p.shortcut === e.key);
      if (preset && props.canRun && !props.isRunning) {
        e.preventDefault();
        runPreset(preset.value);
      }
    };

    const onResize = () => setMenuOpen(false);

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    onCleanup(() => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    });
  });

  const toggleMenu = () => {
    const next = !menuOpen();
    setMenuOpen(next);
    if (next) {
      setTimeout(updatePosition, 0);
    }
  };

  const runPreset = (algorithm: LayoutAlgorithm) => {
    setOption("layoutAlgorithm", algorithm);
    setMenuOpen(false);
    props.onRunLayout("all", algorithm);
  };

  const run = (scope: LayoutScope) => {
    setMenuOpen(false);
    props.onRunLayout(scope);
  };

  const applyOption = (apply: () => void) => {
    apply();
    if (props.canRun && !props.isRunning) {
      props.onRunLayout("all");
    }
  };

  const activePreset = () => PRESETS.find((p) => p.value === layoutAlgorithm());
  const activeSpacing = () => SPACING.find((s) => s.value === layoutSpacing());

  return (
    <div class="diagram-layout-menu-wrap" ref={wrapRef}>
      <div class="header-dropdown-trigger diagram-layout-trigger">
        <button
          type="button"
          class="btn btn-sm diagram-layout-main"
          disabled={!props.canRun || props.isRunning}
          title="Auto-arrange all tables"
          onClick={() => run("all")}
        >
          <Wand2 size={14} />
          {props.isRunning ? "Arranging…" : "Arrange"}
        </button>
        <button
          type="button"
          class="btn btn-sm diagram-layout-caret"
          disabled={!props.canRun}
          aria-expanded={menuOpen()}
          aria-haspopup="menu"
          aria-label="Auto-arrange options"
          title={
            activePreset()
              ? `Auto-arrange: ${activePreset()?.label}`
              : "Auto-arrange options"
          }
          onClick={toggleMenu}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <Show when={menuOpen()}>
        <Portal>
          <div
            ref={menuRef}
            class="diagram-layout-dropdown diagram-layout-dropdown-wide"
            style={{
              left: `${menuPosition().left}px`,
              top: `${menuPosition().top}px`,
            }}
            role="menu"
            aria-label="Auto-arrange"
          >
            <p class="header-dropdown-section-label">Auto-arrange</p>
            <For each={PRESETS}>
              {({ value, label, hint, shortcut, icon: Icon }) => (
                <button
                  type="button"
                  class={`header-dropdown-item diagram-arrange-preset ${layoutAlgorithm() === value ? "active" : ""}`}
                  role="menuitem"
                  disabled={!props.canRun || props.isRunning}
                  onClick={() => runPreset(value)}
                >
                  <Icon size={16} />
                  <span class="diagram-arrange-preset-body">
                    <span class="diagram-arrange-preset-title">
                      <span class="header-dropdown-item-label">{label}</span>
                      <kbd class="diagram-arrange-shortcut">{shortcut}</kbd>
                    </span>
                    <span class="header-dropdown-item-hint">{hint}</span>
                  </span>
                </button>
              )}
            </For>

            <div class="diagram-layout-dropdown-divider" />

            <p class="header-dropdown-section-label">Spacing</p>
            <div
              class="diagram-layout-spacing-segment"
              role="radiogroup"
              aria-label="Table spacing"
            >
              <For each={SPACING}>
                {({ value, label, hint }) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={layoutSpacing() === value}
                    title={hint}
                    class={`diagram-layout-spacing-btn ${layoutSpacing() === value ? "active" : ""}`}
                    onClick={() =>
                      applyOption(() => setOption("layoutSpacing", value))
                    }
                  >
                    {label}
                  </button>
                )}
              </For>
            </div>
            <Show when={activeSpacing()}>
              <p class="diagram-layout-spacing-caption">
                {activeSpacing()?.hint}
              </p>
            </Show>

            <div class="diagram-layout-dropdown-divider" />

            <p class="header-dropdown-section-label">More</p>
            <button
              type="button"
              class="header-dropdown-item"
              role="menuitem"
              disabled={!props.canRunSelection || props.isRunning}
              onClick={() => run("selection")}
            >
              <Network size={15} />
              <span>
                <span class="header-dropdown-item-label">
                  Layout related cluster
                </span>
                <span class="header-dropdown-item-hint">
                  Selected table and its direct relationships
                </span>
              </span>
            </button>
            <button
              type="button"
              class="header-dropdown-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                props.onFitView();
              }}
            >
              <Focus size={15} />
              <span>
                <span class="header-dropdown-item-label">Fit view</span>
                <span class="header-dropdown-item-hint">
                  Zoom to show the full diagram
                </span>
              </span>
            </button>

            <div class="diagram-layout-dropdown-divider" />

            <p class="header-dropdown-section-label">Options</p>
            <label class="diagram-option-row">
              <Checkbox
                checked={layoutFitView()}
                onChange={() => toggleOption("layoutFitView")}
              />
              <span>Fit view after arrange</span>
            </label>
            <label class="diagram-option-row">
              <Checkbox
                checked={layoutSeparateComponents()}
                onChange={() =>
                  applyOption(() => toggleOption("layoutSeparateComponents"))
                }
              />
              <span>Arrange disconnected groups separately</span>
            </label>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
