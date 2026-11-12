import {
  Focus,
  Maximize2,
  MoreHorizontal,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { LayoutScope } from "../../features/diagram-layout/layout-options";
import { useDiagramStore } from "../../stores/diagram-store";
import {
  useDiagramViewStore,
  type LayoutAlgorithm,
} from "../../stores/diagram-view-store";
import { useCanvasContext } from "./canvas-context";
import { LayoutMenu } from "./LayoutMenu";

export interface DiagramLayoutActions {
  runLayout: (scope: LayoutScope, algorithm?: LayoutAlgorithm) => void;
  isRunning: boolean;
  canRun: boolean;
  canRunSelection: boolean;
}

export function DiagramToolbar(props: {
  onFocusSearch: () => void;
  onFocusSelection: () => void;
  layout: DiagramLayoutActions;
}) {
  const canvas = useCanvasContext();

  const searchQuery = () => useDiagramStore((s) => s.searchQuery);
  const setSearchQuery = useDiagramStore.getState().setSearchQuery;
  const selectedTableId = () => useDiagramStore((s) => s.selectedTableId);

  const showMinimap = () => useDiagramViewStore((s) => s.showMinimap);
  const showGrid = () => useDiagramViewStore((s) => s.showGrid);
  const showEdgeLabels = () => useDiagramViewStore((s) => s.showEdgeLabels);
  const showControls = () => useDiagramViewStore((s) => s.showControls);
  const hideUnmatchedSearch = () =>
    useDiagramViewStore((s) => s.hideUnmatchedSearch);
  const emphasizeRelated = () =>
    useDiagramViewStore((s) => s.emphasizeRelated);
  const snapToGrid = () => useDiagramViewStore((s) => s.snapToGrid);
  const animateRelationships = () =>
    useDiagramViewStore((s) => s.animateRelationships);
  const toggleOption = useDiagramViewStore.getState().toggleOption;

  const [optionsOpen, setOptionsOpen] = createSignal(false);
  let optionsRef: HTMLDivElement | undefined;

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!optionsOpen()) return;
      if (optionsRef && !optionsRef.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    onCleanup(() => document.removeEventListener("mousedown", onDocClick));
  });

  const zoomPercent = () => Math.round(canvas.transform().zoom * 100);

  return (
    <div class="diagram-toolbar diagram-toolbar-compact">
      <div class="diagram-search diagram-search-compact">
        <Search size={14} class="diagram-search-icon" aria-hidden />
        <input
          placeholder="Find table…"
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          aria-label="Search tables"
        />
        <Show when={searchQuery().trim()}>
          <button
            type="button"
            class="diagram-search-focus"
            title="Focus matches"
            onClick={props.onFocusSearch}
          >
            <Focus size={13} />
          </button>
        </Show>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-cluster" role="group" aria-label="Zoom">
        <button
          type="button"
          class="btn-icon"
          title="Zoom out"
          onClick={() => canvas.zoomOut({ duration: 150 })}
        >
          <ZoomOut size={15} />
        </button>
        <span class="diagram-zoom-label">{zoomPercent()}%</span>
        <button
          type="button"
          class="btn-icon"
          title="Zoom in"
          onClick={() => canvas.zoomIn({ duration: 150 })}
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          class="btn-icon"
          title="Fit view"
          onClick={() => canvas.fitView({ padding: 0.15, duration: 280 })}
        >
          <Maximize2 size={15} />
        </button>
        <Show when={selectedTableId()}>
          <button
            type="button"
            class="btn-icon"
            title="Focus selection"
            onClick={props.onFocusSelection}
          >
            <Focus size={15} />
          </button>
        </Show>
      </div>

      <div class="toolbar-divider" />

      <LayoutMenu
        isRunning={props.layout.isRunning}
        canRun={props.layout.canRun}
        canRunSelection={props.layout.canRunSelection}
        onRunLayout={props.layout.runLayout}
        onFitView={() => canvas.fitView({ padding: 0.15, duration: 280 })}
      />

      <div class="diagram-toolbar-spacer" />

      <div class="diagram-options-wrap" ref={optionsRef}>
        <button
          type="button"
          class={`btn-icon ${optionsOpen() ? "active" : ""}`}
          title="View options"
          aria-expanded={optionsOpen()}
          onClick={() => setOptionsOpen((o) => !o)}
        >
          <MoreHorizontal size={16} />
        </button>
        <Show when={optionsOpen()}>
          <div class="diagram-options-menu" role="menu">
            <OptionCheck
              label="Grid"
              checked={showGrid()}
              onChange={() => toggleOption("showGrid")}
            />
            <OptionCheck
              label="Minimap"
              checked={showMinimap()}
              onChange={() => toggleOption("showMinimap")}
            />
            <OptionCheck
              label="Relation labels"
              checked={showEdgeLabels()}
              onChange={() => toggleOption("showEdgeLabels")}
            />
            <OptionCheck
              label="Animated flow"
              checked={animateRelationships()}
              onChange={() => toggleOption("animateRelationships")}
            />
            <OptionCheck
              label="Dim unrelated on select"
              checked={emphasizeRelated()}
              onChange={() => toggleOption("emphasizeRelated")}
            />
            <OptionCheck
              label="Hide search non-matches"
              checked={hideUnmatchedSearch()}
              onChange={() => toggleOption("hideUnmatchedSearch")}
            />
            <OptionCheck
              label="Snap to grid"
              checked={snapToGrid()}
              onChange={() => toggleOption("snapToGrid")}
            />
            <OptionCheck
              label="Canvas zoom controls"
              checked={showControls()}
              onChange={() => toggleOption("showControls")}
            />
          </div>
        </Show>
      </div>
    </div>
  );
}

function OptionCheck(props: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label class="diagram-option-row">
      <input type="checkbox" checked={props.checked} onChange={props.onChange} />
      <span>{props.label}</span>
    </label>
  );
}
