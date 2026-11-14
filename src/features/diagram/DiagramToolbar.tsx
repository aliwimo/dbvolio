import {
  Focus,
  Maximize2,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
} from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { LayoutScope } from "../diagram-layout/layout-options";
import { useDiagramStore } from "./diagram-store";
import {
  useDiagramViewStore,
  type LayoutAlgorithm,
} from "./diagram-view-store";
import { useCanvasContext } from "./canvas-context";
import { LayoutMenu } from "./LayoutMenu";
import { Button, Checkbox, SearchField } from "../../shared/ui";

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

  const showGrid = () => useDiagramViewStore((s) => s.showGrid);
  const showEdgeLabels = () => useDiagramViewStore((s) => s.showEdgeLabels);
  const showControls = () => useDiagramViewStore((s) => s.showControls);
  const hideUnmatchedSearch = () =>
    useDiagramViewStore((s) => s.hideUnmatchedSearch);
  const emphasizeRelated = () =>
    useDiagramViewStore((s) => s.emphasizeRelated);
  const snapToGrid = () => useDiagramViewStore((s) => s.snapToGrid);
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
      <SearchField
        class="diagram-search-compact"
        placeholder="Find table…"
        ariaLabel="Search tables"
        value={searchQuery()}
        onInput={setSearchQuery}
        trailing={
          searchQuery().trim() ? (
            <button
              type="button"
              class="diagram-search-focus"
              title="Focus matches"
              onClick={props.onFocusSearch}
            >
              <Focus size={13} />
            </button>
          ) : undefined
        }
      />

      <div class="toolbar-divider" />

      <div class="toolbar-cluster" role="group" aria-label="Zoom">
        <Button
          variant="ghost"
          size="icon"
          title="Zoom out"
          onClick={() => canvas.zoomOut({ duration: 150 })}
        >
          <ZoomOut size={15} />
        </Button>
        <span class="diagram-zoom-label">{zoomPercent()}%</span>
        <Button
          variant="ghost"
          size="icon"
          title="Zoom in"
          onClick={() => canvas.zoomIn({ duration: 150 })}
        >
          <ZoomIn size={15} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Fit view"
          onClick={() => canvas.fitView({ padding: 0.15, duration: 280 })}
        >
          <Maximize2 size={15} />
        </Button>
        <Show when={selectedTableId()}>
          <Button
            variant="ghost"
            size="icon"
            title="Focus selection"
            onClick={props.onFocusSelection}
          >
            <Focus size={15} />
          </Button>
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
        <Button
          variant="ghost"
          size="icon"
          class={optionsOpen() ? "active" : ""}
          title="View options"
          aria-expanded={optionsOpen()}
          onClick={() => setOptionsOpen((o) => !o)}
        >
          <MoreHorizontal size={16} />
        </Button>
        <Show when={optionsOpen()}>
          <div class="diagram-options-menu" role="menu">
            <OptionCheck
              label="Grid"
              checked={showGrid()}
              onChange={() => toggleOption("showGrid")}
            />
            <OptionCheck
              label="Relation labels"
              checked={showEdgeLabels()}
              onChange={() => toggleOption("showEdgeLabels")}
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
      <Checkbox checked={props.checked} onChange={props.onChange} />
      <span>{props.label}</span>
    </label>
  );
}
