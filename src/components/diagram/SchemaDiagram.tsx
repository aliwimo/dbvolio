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
  isGroupNode,
} from "../../features/diagram-layout/table-group-bounds";
import { useDiagramAutoLayout } from "../../features/diagram-layout/useDiagramAutoLayout";
import { applyAssignTableToGroup } from "../../features/schema/apply-schema-edits";
import {
  DiagramContextMenu,
  type DiagramContextMenuState,
} from "./DiagramContextMenu";
import { DiagramToolbar } from "./DiagramToolbar";
import { RelationshipEdge, RelationshipEdgeMarkers } from "./RelationshipEdge";
import { TableGroupNode, type TableGroupNodeData } from "./TableGroupNode";
import { TableNode, type TableNodeData } from "./TableNode";
import { setCanvasContext, type ViewportTransform } from "./canvas-context";

const NODE_WIDTH = 260;
const HEADER_HEIGHT = 34;
const COLUMNS_PADDING = 4;
const ROW_HEIGHT = 26;

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

function getColumnHandleY(node: Node, colName?: string | null, defaultToTop = false): number {
  if (!colName) {
    return defaultToTop ? 40 : 40;
  }
  const data = node.data as TableNodeData | undefined;
  const columns = data?.table?.columns ?? [];
  const idx = columns.findIndex((c) => c.name === colName);
  if (idx < 0) {
    return 40;
  }
  return HEADER_HEIGHT + COLUMNS_PADDING + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
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
  const showEdgeLabels = () => useDiagramViewStore((s) => s.showEdgeLabels);
  const hideUnmatchedSearch = () => useDiagramViewStore((s) => s.hideUnmatchedSearch);
  const emphasizeRelated = () => useDiagramViewStore((s) => s.emphasizeRelated);
  const snapToGrid = () => useDiagramViewStore((s) => s.snapToGrid);
  const animateRelationships = () =>
    useDiagramViewStore((s) => s.animateRelationships);
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
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let startTransform = { x: 0, y: 0 };

  let draggingNodeId: string | null = null;
  let dragStartPointer = { x: 0, y: 0 };
  let dragStartNodePos = { x: 0, y: 0 };

  let initialFitDone = false;

  createEffect(() => {
    setNodes(storeNodes());
    setEdges(storeEdges());
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
      const w = node.width ?? NODE_WIDTH;
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
    if (target.closest(".table-node") || target.closest(".table-group-node")) {
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

  const onPointerMove = (e: PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setTransform((prev) => ({
        ...prev,
        x: startTransform.x + dx,
        y: startTransform.y + dy,
      }));
    } else if (draggingNodeId) {
      const tf = transform();
      const dx = (e.clientX - dragStartPointer.x) / tf.zoom;
      const dy = (e.clientY - dragStartPointer.y) / tf.zoom;
      let newX = dragStartNodePos.x + dx;
      let newY = dragStartNodePos.y + dy;

      if (snapToGrid()) {
        newX = Math.round(newX / 20) * 20;
        newY = Math.round(newY / 20) * 20;
      }

      setNodes((current) =>
        current.map((n) =>
          n.id === draggingNodeId
            ? { ...n, position: { x: newX, y: newY } }
            : n
        )
      );
    }
  };

  const onPointerUp = () => {
    if (isPanning) {
      isPanning = false;
    }
    if (draggingNodeId) {
      draggingNodeId = null;
      useDiagramStore.getState().setFlow(nodes(), edges());
      const entry = entryPoint();
      if (entry) {
        saveDiagramLayout(entry, layoutFromNodes(nodes(), transform()));
      }
    }
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => {
      const newZoom = Math.max(0.1, Math.min(2.5, prev.zoom * zoomFactor));
      const newX = mouseX - (mouseX - prev.x) * (newZoom / prev.zoom);
      const newY = mouseY - (mouseY - prev.y) * (newZoom / prev.zoom);
      return { x: newX, y: newY, zoom: newZoom };
    });
  };

  const startDragNode = (id: string, e: PointerEvent) => {
    e.stopPropagation();
    draggingNodeId = id;
    dragStartPointer = { x: e.clientX, y: e.clientY };
    const n = nodes().find((node) => node.id === id);
    if (n) {
      dragStartNodePos = { x: n.position.x, y: n.position.y };
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

  const nodeMap = createMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes()) {
      map.set(node.id, node);
    }
    return map;
  });

  const query = () => searchQuery().trim().toLowerCase();

  const relatedIds = createMemo(() => {
    const sel = selectedTableId();
    return sel ? buildRelatedTableIds(sel, edges()) : null;
  });

  const isTableHighlighted = (id: string) => {
    const h = hoveredTableId();
    const s = selectedTableId();
    return id === h || id === s;
  };

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
      maxX = Math.max(maxX, n.position.x + (n.width ?? NODE_WIDTH));
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
            class="diagram-grid-overlay"
            style={{
              position: "absolute",
              inset: 0,
              "background-size": `${20 * transform().zoom}px ${20 * transform().zoom}px`,
              "background-position": `${transform().x}px ${transform().y}px`,
              "background-image":
                "radial-gradient(circle, var(--color-border) 1px, transparent 1px)",
              "pointer-events": "none",
            }}
          />
        </Show>

        <div
          class="diagram-canvas-layer"
          style={{
            transform: `translate(${transform().x}px, ${transform().y}px) scale(${transform().zoom})`,
            "transform-origin": "0 0",
            position: "absolute",
            inset: 0,
            "pointer-events": "auto",
          }}
        >
          <svg
            class="diagram-edges-svg"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "50000px",
              height: "50000px",
              overflow: "visible",
              "pointer-events": "none",
            }}
          >
            <RelationshipEdgeMarkers />
            <For each={edges()}>
              {(edge) => {
                const sourceNode = () => nodeMap().get(edge.source);
                const targetNode = () => nodeMap().get(edge.target);

                const edgeCoords = () => {
                  const s = sourceNode();
                  const t = targetNode();
                  if (!s || !t) return null;
                  const sW = s.width ?? NODE_WIDTH;
                  const data = edge.data as any;
                  const srcCol = data?.sourceColumns?.[0];
                  const tgtCol = data?.targetColumns?.[0];

                  const srcY = getColumnHandleY(s, srcCol, false);
                  const tgtY = getColumnHandleY(t, tgtCol, false);

                  return {
                    sourceX: s.position.x + sW,
                    sourceY: s.position.y + srcY,
                    targetX: t.position.x,
                    targetY: t.position.y + tgtY,
                  };
                };

                const isHighlighted = () =>
                  Boolean(
                    isTableHighlighted(edge.source) ||
                    isTableHighlighted(edge.target)
                  );

                const isDimmed = () => {
                  const rel = relatedIds();
                  if (emphasizeRelated() && rel) {
                    if (!rel.has(edge.source) || !rel.has(edge.target)) {
                      return true;
                    }
                  }
                  return false;
                };

                return (
                  <Show when={edgeCoords()}>
                    {(coords) => (
                      <RelationshipEdge
                        id={edge.id}
                        sourceX={coords().sourceX}
                        sourceY={coords().sourceY}
                        targetX={coords().targetX}
                        targetY={coords().targetY}
                        data={{
                          ...(edge.data as any),
                          showLabels: showEdgeLabels(),
                          highlighted: isHighlighted(),
                          dimmed: isDimmed(),
                          animate: animateRelationships(),
                        }}
                      />
                    )}
                  </Show>
                );
              }}
            </For>
          </svg>

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
                    class={`diagram-node-wrapper ${isGroup() ? "group-wrapper" : "table-wrapper"}`}
                    data-node-id={node.id}
                    style={{
                      position: "absolute",
                      left: `${node.position.x}px`,
                      top: `${node.position.y}px`,
                      "z-index": isGroup() ? 1 : isSelected() ? 10 : 2,
                      cursor: "grab",
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
                              maxX = Math.max(maxX, n.position.x + (n.width ?? NODE_WIDTH));
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
                          data={{ ...(node.data as TableNodeData), dimmed: isDimmed() }}
                        />
                      }
                    >
                      <TableGroupNode
                        id={node.id}
                        selected={isSelected()}
                        data={{ ...(node.data as TableGroupNodeData), dimmed: isDimmed() }}
                      />
                    </Show>
                  </div>
                </Show>
              );
            }}
          </For>
        </div>

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
