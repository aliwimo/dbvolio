import {
  Focus,
  Maximize2,
  MoreHorizontal,
  Plus,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDiagramAutoLayout } from "../../features/diagram-layout/useDiagramAutoLayout";
import { useDiagramStore } from "../../stores/diagram-store";
import { useDiagramViewStore } from "../../stores/diagram-view-store";
import { useUiStore } from "../../stores/ui-store";
import { useReactFlow, useStore } from "@xyflow/react";
import { LayoutMenu } from "./LayoutMenu";

const zoomSelector = (s: { transform: [number, number, number] }) =>
  s.transform[2];

export function DiagramToolbar({
  onFocusSearch,
  onFocusSelection,
}: {
  onFocusSearch: () => void;
  onFocusSelection: () => void;
}) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const zoom = useStore(zoomSelector);
  const openTableCreate = useUiStore((s) => s.openTableCreate);

  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const searchQuery = useDiagramStore((s) => s.searchQuery);
  const setSearchQuery = useDiagramStore((s) => s.setSearchQuery);
  const selectedTableId = useDiagramStore((s) => s.selectedTableId);

  const showMinimap = useDiagramViewStore((s) => s.showMinimap);
  const showGrid = useDiagramViewStore((s) => s.showGrid);
  const showEdgeLabels = useDiagramViewStore((s) => s.showEdgeLabels);
  const showControls = useDiagramViewStore((s) => s.showControls);
  const hideUnmatchedSearch = useDiagramViewStore((s) => s.hideUnmatchedSearch);
  const emphasizeRelated = useDiagramViewStore((s) => s.emphasizeRelated);
  const snapToGrid = useDiagramViewStore((s) => s.snapToGrid);
  const animateRelationships = useDiagramViewStore(
    (s) => s.animateRelationships,
  );
  const toggleOption = useDiagramViewStore((s) => s.toggleOption);

  const { runLayout, isRunning, canRun, canRunSelection } = useDiagramAutoLayout(
    {
      nodes,
      edges,
      fitView,
    },
  );

  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) {
      return;
    }
    const onDocClick = (e: MouseEvent) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(e.target as Node)
      ) {
        setOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [optionsOpen]);

  return (
    <div className="diagram-toolbar diagram-toolbar-compact">
      <div className="diagram-search diagram-search-compact">
        <Search size={14} className="diagram-search-icon" aria-hidden />
        <input
          placeholder="Find table…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search tables"
        />
        {searchQuery.trim() && (
          <button
            type="button"
            className="diagram-search-focus"
            title="Focus matches"
            onClick={onFocusSearch}
          >
            <Focus size={13} />
          </button>
        )}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-cluster" role="group" aria-label="Zoom">
        <button
          type="button"
          className="btn-icon"
          title="Zoom out"
          onClick={() => zoomOut({ duration: 150 })}
        >
          <ZoomOut size={15} />
        </button>
        <span className="diagram-zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="btn-icon"
          title="Zoom in"
          onClick={() => zoomIn({ duration: 150 })}
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          className="btn-icon"
          title="Fit view"
          onClick={() => fitView({ padding: 0.15, duration: 280 })}
        >
          <Maximize2 size={15} />
        </button>
        {selectedTableId && (
          <button
            type="button"
            className="btn-icon"
            title="Focus selection"
            onClick={onFocusSelection}
          >
            <Focus size={15} />
          </button>
        )}
      </div>

      <div className="toolbar-divider" />

      <LayoutMenu
        isRunning={isRunning}
        canRun={canRun}
        canRunSelection={canRunSelection}
        onRunLayout={runLayout}
        onFitView={() => fitView({ padding: 0.15, duration: 280 })}
      />

      <div className="toolbar-divider" />

      <button
        type="button"
        className="btn btn-sm btn-ghost"
        title="Create new table visually"
        onClick={openTableCreate}
      >
        <Plus size={14} />
        <span>New table</span>
      </button>

      <div className="diagram-toolbar-spacer" />

      <div className="diagram-options-wrap" ref={optionsRef}>
        <button
          type="button"
          className={`btn-icon ${optionsOpen ? "active" : ""}`}
          title="View options"
          aria-expanded={optionsOpen}
          onClick={() => setOptionsOpen((o) => !o)}
        >
          <MoreHorizontal size={16} />
        </button>
        {optionsOpen && (
          <div className="diagram-options-menu" role="menu">
            <OptionCheck
              label="Grid"
              checked={showGrid}
              onChange={() => toggleOption("showGrid")}
            />
            <OptionCheck
              label="Minimap"
              checked={showMinimap}
              onChange={() => toggleOption("showMinimap")}
            />
            <OptionCheck
              label="Relation labels"
              checked={showEdgeLabels}
              onChange={() => toggleOption("showEdgeLabels")}
            />
            <OptionCheck
              label="Animated flow"
              checked={animateRelationships}
              onChange={() => toggleOption("animateRelationships")}
            />
            <OptionCheck
              label="Dim unrelated on select"
              checked={emphasizeRelated}
              onChange={() => toggleOption("emphasizeRelated")}
            />
            <OptionCheck
              label="Hide search non-matches"
              checked={hideUnmatchedSearch}
              onChange={() => toggleOption("hideUnmatchedSearch")}
            />
            <OptionCheck
              label="Snap to grid"
              checked={snapToGrid}
              onChange={() => toggleOption("snapToGrid")}
            />
            <OptionCheck
              label="Canvas zoom controls"
              checked={showControls}
              onChange={() => toggleOption("showControls")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="diagram-option-row">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
