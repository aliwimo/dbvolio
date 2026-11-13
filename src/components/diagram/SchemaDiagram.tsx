import {
  createSignal,
  createEffect,
  createMemo,
  For,
  Show,
  onMount,
  onCleanup,
} from "solid-js";
import type { Node, Edge } from "../../types/flow";
import {
  layoutFromNodes,
  saveDiagramLayout,
} from "../../services/layout-service";
import { registerDiagramExportApi } from "../../services/diagram-export";
import { useDiagramStore } from "../../stores/diagram-store";
import { useDiagramViewStore } from "../../stores/diagram-view-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import {
  groupNodeId,
  isGroupNode,
  syncTableGroupBounds,
} from "../../features/diagram-layout/table-group-bounds";
import { useDiagramAutoLayout } from "../../features/diagram-layout/useDiagramAutoLayout";
import { applyAssignTableToGroup } from "../../features/schema/apply-schema-edits";
import {
  DiagramContextMenu,
  type DiagramContextMenuState,
} from "./DiagramContextMenu";
import { DiagramToolbar } from "./DiagramToolbar";
import { DiagramEdges } from "./DiagramEdges";
import {
  getRelationshipEdgePoints,
  TABLE_NODE_WIDTH,
} from "../../features/diagram/relationship-edge-geometry";
import { computeOrthogonalPath } from "./RelationshipEdge";
import { TableGroupNode, type TableGroupNodeData } from "./TableGroupNode";
import { TableNode, type TableNodeData } from "./TableNode";
import { setCanvasContext, type ViewportTransform } from "./canvas-context";

function nodeMatchesSearch(node: Node, query: string): boolean {
  if (isGroupNode(node)) {
    const groupData = node.data as TableGroupNodeData;
    const groupName = groupData.group?.name?.toLowerCase() ?? "";
    return groupName.includes(query);
  }
  const data = node.data as {
    table?: { name?: string; groupId?: string };
  };
  const name = data.table?.name?.toLowerCase() ?? "";
  const groupId = data.table?.groupId?.toLowerCase() ?? "";
  return (
    name.includes(query) ||
    node.id.toLowerCase().includes(query) ||
    groupId.includes(query)
  );
}

function buildRelatedTableIds(
  selectedId: string | null,
  edges: Edge[]
): Set<string> | null {
  if (!selectedId) return null;
  const related = new Set<string>([selectedId]);
  for (const edge of edges) {
    if (edge.source === selectedId || edge.target === selectedId) {
      related.add(edge.source);
      related.add(edge.target);
    }
  }
  return related;
}

export function SchemaDiagram() {
  const storeNodes = () => useDiagramStore((s) => s.nodes);
  const storeEdges = () => useDiagramStore((s) => s.edges);
  const isStale = () => useDiagramStore((s) => s.isStale);
  const searchQuery = () => useDiagramStore((s) => s.searchQuery);
  const selectedTableId = () => useDiagramStore((s) => s.selectedTableId);
  const hoveredTableId = () => useDiagramStore((s) => s.hoveredTableId);
  const setHoveredTable = useDiagramStore.getState().setHoveredTable;
  const selectTable = useDiagramStore.getState().selectTable;
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const projectScope = () => useProjectStore((s) => s.projectScope);
  const projectFiles = () => useProjectStore((s) => s.files);

  const showGrid = () => useDiagramViewStore((s) => s.showGrid);
  const showControls = () => useDiagramViewStore((s) => s.showControls);
  const showEdgeLabels = () => useDiagramViewStore((s) => s.showEdgeLabels);
  const hideUnmatchedSearch = () => useDiagramViewStore((s) => s.hideUnmatchedSearch);
  const emphasizeRelated = () => useDiagramViewStore((s) => s.emphasizeRelated);
  const snapToGrid = () => useDiagramViewStore((s) => s.snapToGrid);
  const pendingViewport = () => useDiagramViewStore((s) => s.pendingViewport);
  const setPendingViewport = useDiagramViewStore.getState().setPendingViewport;

  const [nodes, setNodes] = createSignal<Node[]>([]);
  const [edges, setEdges] = createSignal<Edge[]>([]);
  const [transform, setTransform] = createSignal<ViewportTransform>({
    x: 40,
    y: 40,
    zoom: 1,
  });
  const [contextMenu, setContextMenu] =
    createSignal<DiagramContextMenuState | null>(null);

  let containerRef: HTMLDivElement | undefined;
  let layerEl: HTMLDivElement | undefined;
  let gridEl: HTMLDivElement | undefined;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let startTransform = { x: 0, y: 0 };

  let draggingNodeId: string | null = null;
  let dragCaptureTarget: HTMLElement | null = null;
  let dragPointerId: number | null = null;
  let dragStartPointer = { x: 0, y: 0 };
  let dragStartNodePos = { x: 0, y: 0 };
  let didDrag = false;
  let dragRafId: number | null = null;
  let pendingPointerPos: { x: number; y: number } | null = null;
  let dragEl: HTMLElement | null = null;
  let dragCompanions: {
    id: string;
    el: HTMLElement;
    startX: number;
    startY: number;
  }[] = [];
  let dragGroupEl: HTMLElement | null = null;
  let dragGroupInner: HTMLElement | null = null;
  let dragGroupNodeId: string | null = null;
  let dragLinks: {
    group: SVGGElement;
    edge: Edge;
    source: Node;
    target: Node;
  }[] = [];
  let viewportDirty = false;
  let liveViewport: ViewportTransform = { x: 40, y: 40, zoom: 1 };
  let wheelRafId: number | null = null;
  let pendingWheel: { mouseX: number; mouseY: number; factor: number } | null = null;

  let initialFitDone = false;

  createEffect(() => {
    const nextNodes = storeNodes();
    const nextEdges = storeEdges();
    if (draggingNodeId) {
      setEdges(nextEdges);
      return;
    }
    setNodes(nextNodes);
    setEdges(nextEdges);
  });

  const zoomIn = () => {
    setTransform((prev) => {
      const zoom = Math.min(2.5, prev.zoom * 1.2);
      return { ...prev, zoom };
    });
  };

  const zoomOut = () => {
    setTransform((prev) => {
      const zoom = Math.max(0.1, prev.zoom / 1.2);
      return { ...prev, zoom };
    });
  };

  const fitView = (options?: { padding?: number; duration?: number }) => {
    const currentNodes = nodes();
    if (currentNodes.length === 0 || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of currentNodes) {
      const x = node.position.x;
      const y = node.position.y;
      const w = node.width ?? TABLE_NODE_WIDTH;
      const h = node.height ?? 200;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    const padding = (options?.padding ?? 0.15) * Math.min(rect.width, rect.height);
    const graphWidth = maxX - minX + padding * 2;
    const graphHeight = maxY - minY + padding * 2;
    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;
    const zoom = Math.max(0.15, Math.min(1.2, Math.min(scaleX, scaleY)));

    const x = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom;
    const y = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;

    setTransform({ x, y, zoom });
  };

  const applyViewport = (tf: ViewportTransform) => {
    liveViewport = tf;
    if (layerEl) {
      layerEl.style.transform = `translate(${tf.x}px, ${tf.y}px) scale(${tf.zoom})`;
    }
    if (gridEl) {
      const step = tf.zoom < 0.45 ? 80 : tf.zoom < 0.8 ? 40 : 20;
      const size = step * tf.zoom;
      const opacity = Math.min(1, Math.max(0.2, (tf.zoom - 0.2) / 0.6));
      gridEl.style.backgroundSize = `${size}px ${size}px`;
      gridEl.style.backgroundPosition = `${tf.x}px ${tf.y}px`;
      gridEl.style.opacity = String(opacity);
    }
  };

  createEffect(() => {
    showGrid();
    if (viewportDirty) return;
    applyViewport(transform());
  });

  createEffect(() => {
    const vp = pendingViewport();
    if (vp) {
      setTransform({ x: vp.x, y: vp.y, zoom: vp.zoom });
      setPendingViewport(null);
      initialFitDone = true;
    } else if (!initialFitDone && nodes().length > 0) {
      initialFitDone = true;
      requestAnimationFrame(() => fitView());
    }
  });

  const layout = useDiagramAutoLayout({
    nodes: () => nodes(),
    edges: () => edges(),
    fitView,
  });

  setCanvasContext({
    transform,
    setTransform,
    zoomIn,
    zoomOut,
    fitView,
    setPendingFitView: () => fitView(),
  });

  onMount(() => {
    registerDiagramExportApi({
      getNodes: () => nodes(),
      getEdges: () => edges(),
      getInternalNode: (id: string) => {
        const n = nodes().find((node) => node.id === id);
        return n
          ? {
              ...n,
              internals: {
                positionAbsolute: n.position,
              },
            }
          : undefined;
      },
    });

    onCleanup(() => {
      registerDiagramExportApi(null);
    });
  });

  const onPointerDown = (e: PointerEvent) => {
    if (e.button === 2) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(".table-node") ||
      target.closest(".table-group-node") ||
      target.closest(".diagram-canvas-controls")
    ) {
      return;
    }
    selectTable(null);
    setHoveredTable(null);
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    startTransform = { x: transform().x, y: transform().y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const flushPointerMove = () => {
    dragRafId = null;
    if (!pendingPointerPos) return;
    const { x: clientX, y: clientY } = pendingPointerPos;
    pendingPointerPos = null;

    if (isPanning) {
      const dx = clientX - panStart.x;
      const dy = clientY - panStart.y;
      viewportDirty = true;
      applyViewport({
        x: startTransform.x + dx,
        y: startTransform.y + dy,
        zoom: transform().zoom,
      });
    } else if (draggingNodeId && dragEl) {
      const rawDx = clientX - dragStartPointer.x;
      const rawDy = clientY - dragStartPointer.y;
      if (!didDrag && (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3)) {
        didDrag = true;
      }

      const tf = transform();
      const dx = rawDx / tf.zoom;
      const dy = rawDy / tf.zoom;
      let newX = dragStartNodePos.x + dx;
      let newY = dragStartNodePos.y + dy;

      if (snapToGrid()) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }

      dragEl.style.left = `${newX}px`;
      dragEl.style.top = `${newY}px`;
      const movedX = newX - dragStartNodePos.x;
      const movedY = newY - dragStartNodePos.y;
      const positions = new Map<string, { x: number; y: number }>([
        [draggingNodeId, { x: newX, y: newY }],
      ]);
      for (const companion of dragCompanions) {
        const x = companion.startX + movedX;
        const y = companion.startY + movedY;
        companion.el.style.left = `${x}px`;
        companion.el.style.top = `${y}px`;
        positions.set(companion.id, { x, y });
      }
      paintDraggedEdges(positions);
      paintDraggedGroup(positions);
    }
  };

  const paintDraggedGroup = (positions: Map<string, { x: number; y: number }>) => {
    if (!dragGroupEl || !dragGroupNodeId) return;
    const preview = nodes().map((node) => {
      const next = positions.get(node.id);
      return next ? { ...node, position: next } : node;
    });
    const group = syncTableGroupBounds(preview).find(
      (node) => node.id === dragGroupNodeId,
    );
    if (!group) return;
    dragGroupEl.style.left = `${group.position.x}px`;
    dragGroupEl.style.top = `${group.position.y}px`;
    if (dragGroupInner) {
      dragGroupInner.style.width = `${group.width}px`;
      dragGroupInner.style.height = `${group.height}px`;
    }
  };

  const paintDraggedEdges = (positions: Map<string, { x: number; y: number }>) => {
    for (const link of dragLinks) {
      const sourcePos = positions.get(link.edge.source);
      const targetPos = positions.get(link.edge.target);
      const source = sourcePos
        ? { ...link.source, position: sourcePos }
        : link.source;
      const target = targetPos
        ? { ...link.target, position: targetPos }
        : link.target;
      const [d, labelX, labelY, arrow] = computeOrthogonalPath({
        ...getRelationshipEdgePoints(link.edge, source, target),
        channel: Number(link.group.dataset.channel ?? 0),
      });
      const paths = link.group.querySelectorAll("path");
      for (const path of paths) {
        path.setAttribute(
          "d",
          path.classList.contains("relationship-edge-arrow") ? arrow : d,
        );
      }
      const label = link.group.querySelector("foreignObject");
      if (label) {
        label.setAttribute("x", String(labelX - 80));
        label.setAttribute("y", String(labelY - 14));
      }
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    pendingPointerPos = { x: e.clientX, y: e.clientY };
    if (dragRafId === null) {
      dragRafId = requestAnimationFrame(flushPointerMove);
    }
  };

  const onPointerUp = () => {
    if (dragRafId !== null) {
      cancelAnimationFrame(dragRafId);
      dragRafId = null;
    }
    if (pendingPointerPos) {
      flushPointerMove();
    }
    if (isPanning) {
      isPanning = false;
      viewportDirty = false;
      setTransform({ ...liveViewport });
    }
    if (dragCaptureTarget && dragPointerId !== null) {
      try {
        dragCaptureTarget.releasePointerCapture(dragPointerId);
      } catch {
        /* already released */
      }
      dragCaptureTarget = null;
      dragPointerId = null;
    }
    if (draggingNodeId) {
      const id = draggingNodeId;
      const left = dragEl ? Number.parseFloat(dragEl.style.left) : dragStartNodePos.x;
      const top = dragEl ? Number.parseFloat(dragEl.style.top) : dragStartNodePos.y;
      const positions = new Map<string, { x: number; y: number }>([
        [id, { x: left, y: top }],
      ]);
      for (const companion of dragCompanions) {
        positions.set(companion.id, {
          x: Number.parseFloat(companion.el.style.left),
          y: Number.parseFloat(companion.el.style.top),
        });
      }
      draggingNodeId = null;
      dragEl = null;
      dragCompanions = [];
      dragGroupEl = null;
      dragGroupInner = null;
      dragGroupNodeId = null;
      dragLinks = [];
      if (didDrag) {
        setNodes((current) =>
          syncTableGroupBounds(
            current.map((n) => {
              const next = positions.get(n.id);
              return next ? { ...n, position: next } : n;
            }),
          ),
        );
      }
      useDiagramStore.getState().setFlow(nodes(), edges());
      const entry = entryPoint();
      if (entry) {
        saveDiagramLayout(entry, layoutFromNodes(nodes(), transform()));
      }
    }
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  const flushWheel = () => {
    wheelRafId = null;
    const pending = pendingWheel;
    pendingWheel = null;
    if (!pending) return;
    const { mouseX, mouseY, factor } = pending;
    setTransform((prev) => {
      const newZoom = Math.max(0.1, Math.min(2.5, prev.zoom * factor));
      const newX = mouseX - (mouseX - prev.x) * (newZoom / prev.zoom);
      const newY = mouseY - (mouseY - prev.y) * (newZoom / prev.zoom);
      return { x: newX, y: newY, zoom: newZoom };
    });
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    if (pendingWheel) {
      pendingWheel.mouseX = mouseX;
      pendingWheel.mouseY = mouseY;
      pendingWheel.factor *= zoomFactor;
    } else {
      pendingWheel = { mouseX, mouseY, factor: zoomFactor };
    }
    if (wheelRafId === null) {
      wheelRafId = requestAnimationFrame(flushWheel);
    }
  };

  const startDragNode = (id: string, e: PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    draggingNodeId = id;
    didDrag = false;
    dragStartPointer = { x: e.clientX, y: e.clientY };
    const n = nodes().find((node) => node.id === id);
    if (n) {
      dragStartNodePos = { x: n.position.x, y: n.position.y };
    }
    dragCaptureTarget = (e.currentTarget as HTMLElement | undefined) ?? null;
    dragPointerId = e.pointerId;
    dragCaptureTarget?.setPointerCapture(e.pointerId);
    dragEl = containerRef?.querySelector(
      `.diagram-node-wrapper[data-node-id="${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    const currentNodes = nodes();
    const byId = new Map(currentNodes.map((node) => [node.id, node]));
    dragCompanions = [];
    dragGroupEl = null;
    dragGroupInner = null;
    dragGroupNodeId = null;
    const dragged = byId.get(id);
    const memberIds =
      dragged && isGroupNode(dragged)
        ? ((dragged.data as TableGroupNodeData).group?.tableIds ?? [])
        : [];
    if (containerRef && memberIds.length > 0) {
      for (const memberId of memberIds) {
        const member = byId.get(memberId);
        const el = containerRef.querySelector(
          `.diagram-node-wrapper[data-node-id="${CSS.escape(memberId)}"]`,
        ) as HTMLElement | null;
        if (!member || !el) continue;
        dragCompanions.push({
          id: memberId,
          el,
          startX: member.position.x,
          startY: member.position.y,
        });
      }
    } else if (containerRef && dragged && !isGroupNode(dragged)) {
      const groupId = (dragged.data as TableNodeData | undefined)?.table?.groupId;
      if (groupId) {
        dragGroupNodeId = groupNodeId(groupId);
        dragGroupEl = containerRef.querySelector(
          `.diagram-node-wrapper[data-node-id="${CSS.escape(dragGroupNodeId)}"]`,
        ) as HTMLElement | null;
        dragGroupInner = dragGroupEl?.querySelector(
          ".table-group-node",
        ) as HTMLElement | null;
      }
    }
    const movingIds = new Set([id, ...memberIds]);
    dragLinks = [];
    if (containerRef) {
      const selector = [...movingIds]
        .flatMap((movingId) => [
          `g.relationship-edge-group[data-source="${CSS.escape(movingId)}"]`,
          `g.relationship-edge-group[data-target="${CSS.escape(movingId)}"]`,
        ])
        .join(", ");
      const groups = selector
        ? containerRef.querySelectorAll<SVGGElement>(selector)
        : [];
      for (const group of groups) {
        const edge = edges().find((item) => item.id === group.dataset.edgeId);
        if (!edge) continue;
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target) continue;
        dragLinks.push({ group, edge, source, target });
      }
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const nodeEl = target.closest(".table-node") as HTMLElement | null;
    const tableId = nodeEl?.getAttribute("data-node-id") ?? null;
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tableId,
    });
  };

  const query = () => searchQuery().trim().toLowerCase();

  const visibleEdges = () => {
    const list = edges();
    const q = query();
    if (!q || !hideUnmatchedSearch()) return list;
    const ids = new Set(
      nodes()
        .filter((node) => nodeMatchesSearch(node, q))
        .map((node) => node.id),
    );
    return list.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  };

  const relatedIds = createMemo(() => {
    const sel = selectedTableId();
    return sel ? buildRelatedTableIds(sel, edges()) : null;
  });

  const focusSearch = () => {
    const q = query();
    if (!q || !containerRef) return;
    const matching = nodes().filter((n) => nodeMatchesSearch(n, q));
    if (matching.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of matching) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + (n.width ?? TABLE_NODE_WIDTH));
      maxY = Math.max(maxY, n.position.y + (n.height ?? 200));
    }
    const rect = containerRef.getBoundingClientRect();
    const pad = 80;
    const zoom = Math.max(0.2, Math.min(1.2, Math.min(rect.width / (maxX - minX + pad), rect.height / (maxY - minY + pad))));
    const x = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom;
    const y = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;
    setTransform({ x, y, zoom });
  };

  const focusSelection = () => {
    const selId = selectedTableId();
    if (!selId || !containerRef) return;
    const node = nodes().find((n) => n.id === selId);
    if (!node) return;
    const rect = containerRef.getBoundingClientRect();
    const targetZoom = 1;
    const x = rect.width / 2 - (node.position.x + 130) * targetZoom;
    const y = rect.height / 2 - (node.position.y + 80) * targetZoom;
    setTransform({ x, y, zoom: targetZoom });
  };

  return (
    <div class="panel panel-fill panel-flush" style={{ display: "flex", "flex-direction": "column" }}>
      <Show when={isStale()}>
        <div class="stale-banner">
          Showing last valid schema — fix parse errors to refresh.
        </div>
      </Show>

      <DiagramToolbar
        onFocusSearch={focusSearch}
        onFocusSelection={focusSelection}
        layout={layout}
      />

      <div
        ref={containerRef}
        class="diagram-canvas"
        onPointerDown={onPointerDown}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          "user-select": "none",
        }}
      >
        <Show when={showGrid()}>
          <div
            ref={gridEl}
            class="diagram-grid-overlay"
            style={{
              position: "absolute",
              inset: 0,
              "pointer-events": "none",
            }}
          />
        </Show>

        <div
          ref={layerEl}
          class="diagram-canvas-layer"
          style={{
            "transform-origin": "0 0",
            position: "absolute",
            inset: 0,
            "pointer-events": "auto",
          }}
        >
          <DiagramEdges
            nodes={nodes}
            edges={visibleEdges}
            showLabels={showEdgeLabels}
            emphasizeRelated={emphasizeRelated}
            selectedId={selectedTableId}
            hoveredId={hoveredTableId}
          />

          <For each={nodes()}>
            {(node) => {
              const isGroup = () => isGroupNode(node);
              const isSelected = () => node.id === selectedTableId();
              const isDimmed = () => {
                if (emphasizeRelated() && relatedIds()) {
                  const rel = relatedIds()!;
                  if (isGroup()) {
                    const g = (node.data as TableGroupNodeData).group;
                    const hasTable = (g?.tableIds ?? []).some((id) => rel.has(id));
                    if (!hasTable) return true;
                  } else if (!rel.has(node.id)) {
                    return true;
                  }
                }
                const q = query();
                if (q && !nodeMatchesSearch(node, q)) {
                  return true;
                }
                return false;
              };

              const isHidden = () => {
                const q = query();
                if (q && hideUnmatchedSearch() && !nodeMatchesSearch(node, q)) {
                  return true;
                }
                return false;
              };

              return (
                <Show when={!isHidden()}>
                  <div
                    class={`diagram-node-wrapper ${isGroup() ? "group-wrapper" : "table-wrapper"}${isDimmed() ? " is-dimmed" : ""}`}
                    data-node-id={node.id}
                    style={{
                      position: "absolute",
                      left: `${node.position.x}px`,
                      top: `${node.position.y}px`,
                      "z-index": isGroup() ? 1 : isSelected() ? 10 : 2,
                      cursor: "grab",
                      "touch-action": "none",
                    }}
                    onPointerDown={(e) => startDragNode(node.id, e)}
                    onMouseEnter={() => {
                      if (!isGroup()) {
                        setHoveredTable(node.id);
                      }
                    }}
                    onMouseLeave={() => {
                      if (!isGroup()) {
                        setHoveredTable(null);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (didDrag) return;
                      if (!isGroup()) {
                        if (selectedTableId() === node.id) {
                          selectTable(null);
                        } else {
                          selectTable(node.id);
                        }
                      } else {
                        const group = (node.data as TableGroupNodeData).group;
                        if (group && group.tableIds.length > 0) {
                          const memberNodes = nodes().filter((n) => group.tableIds.includes(n.id));
                          if (memberNodes.length > 0 && containerRef) {
                            let minX = Infinity;
                            let minY = Infinity;
                            let maxX = -Infinity;
                            let maxY = -Infinity;
                            for (const n of memberNodes) {
                              minX = Math.min(minX, n.position.x);
                              minY = Math.min(minY, n.position.y);
                              maxX = Math.max(maxX, n.position.x + (n.width ?? TABLE_NODE_WIDTH));
                              maxY = Math.max(maxY, n.position.y + (n.height ?? 200));
                            }
                            const rect = containerRef.getBoundingClientRect();
                            const pad = 100;
                            const zoom = Math.max(0.2, Math.min(1.2, Math.min(rect.width / (maxX - minX + pad), rect.height / (maxY - minY + pad))));
                            const x = (rect.width - (maxX - minX) * zoom) / 2 - minX * zoom;
                            const y = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;
                            setTransform({ x, y, zoom });
                          }
                        }
                      }
                    }}
                  >
                    <Show
                      when={isGroup()}
                      fallback={
                        <TableNode
                          id={node.id}
                          selected={isSelected()}
                          data={node.data as TableNodeData}
                        />
                      }
                    >
                      <TableGroupNode
                        id={node.id}
                        selected={isSelected()}
                        data={node.data as TableGroupNodeData}
                      />
                    </Show>
                  </div>
                </Show>
              );
            }}
          </For>
        </div>

        <Show when={showControls()}>
          <div
            class="diagram-canvas-controls"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button type="button" title="Zoom in" onClick={zoomIn}>
              +
            </button>
            <button type="button" title="Zoom out" onClick={zoomOut}>
              −
            </button>
            <button type="button" title="Fit view" onClick={() => fitView()}>
              ⌂
            </button>
          </div>
        </Show>

        <Show when={contextMenu()}>
          {(menu) => (
            <DiagramContextMenu
              state={menu()}
              isRunning={layout.isRunning}
              canRun={layout.canRun}
              canRunSelection={layout.canRunSelection}
              onRunLayout={layout.runLayout}
              onFitView={() => fitView()}
              onFocusTable={(id) => {
                selectTable(id);
                focusSelection();
              }}
              onEditTable={(id) => {
                selectTable(id);
                useUiStore.getState().openTableEdit();
              }}
              onNewTable={() => useUiStore.getState().openTableCreate()}
              onAddToGroup={(tableId, target) => {
                const table = useDiagramStore
                  .getState()
                  .lastValidModel?.tables.find((t) => t.id === tableId);
                if (!table) return;
                const groupTarget =
                  target.kind === "existing"
                    ? {
                        name:
                          useDiagramStore
                            .getState()
                            .model?.tableGroups?.find(
                              (g) => g.id === target.groupId
                            )?.name ?? target.groupId,
                      }
                    : { name: target.name };
                void applyAssignTableToGroup(
                  table,
                  groupTarget,
                  projectFiles(),
                  {
                    entryPoint: entryPoint(),
                    projectScope: projectScope(),
                  }
                );
              }}
              onRemoveFromGroup={(tableId) => {
                const table = useDiagramStore
                  .getState()
                  .lastValidModel?.tables.find((t) => t.id === tableId);
                if (!table) return;
                void applyAssignTableToGroup(table, null, projectFiles(), {
                  entryPoint: entryPoint(),
                  projectScope: projectScope(),
                });
              }}
              onClose={() => setContextMenu(null)}
            />
          )}
        </Show>
      </div>
    </div>
  );
}
