import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyAssignTableToGroup } from "../../features/schema/apply-schema-edits";
import { registerDiagramExportApi } from "../../services/diagram-export";
import {
  layoutFromNodes,
  saveDiagramLayout,
} from "../../services/layout-service";
import { useDiagramStore } from "../../stores/diagram-store";
import { useDiagramViewStore } from "../../stores/diagram-view-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import { isLargeDiagram } from "../../features/diagram/diagram-performance";
import {
  isGroupNode,
  syncTableGroupBounds,
} from "../../features/diagram-layout/table-group-bounds";
import { useDiagramAutoLayout } from "../../features/diagram-layout/useDiagramAutoLayout";
import {
  DiagramContextMenu,
  type AddToGroupTarget,
  type DiagramContextMenuState,
} from "./DiagramContextMenu";
import { DiagramToolbar } from "./DiagramToolbar";
import { RelationshipEdge, RelationshipEdgeMarkers } from "./RelationshipEdge";
import { TableGroupNode, type TableGroupNodeData } from "./TableGroupNode";
import { TableNode } from "./TableNode";

const nodeTypes = { tableNode: TableNode, tableGroupNode: TableGroupNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

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
  edges: Edge[],
): Set<string> | null {
  if (!selectedId) {
    return null;
  }
  const related = new Set<string>([selectedId]);
  for (const edge of edges) {
    if (edge.source === selectedId || edge.target === selectedId) {
      related.add(edge.source);
      related.add(edge.target);
    }
  }
  return related;
}

function DiagramFlow() {
  const storeNodes = useDiagramStore((s) => s.nodes);
  const storeEdges = useDiagramStore((s) => s.edges);
  const isStale = useDiagramStore((s) => s.isStale);
  const searchQuery = useDiagramStore((s) => s.searchQuery);
  const selectTable = useDiagramStore((s) => s.selectTable);
  const setHoveredTable = useDiagramStore((s) => s.setHoveredTable);
  const selectedTableId = useDiagramStore((s) => s.selectedTableId);
  const hoveredTableId = useDiagramStore((s) => s.hoveredTableId);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const projectFiles = useProjectStore((s) => s.files);
  const openTableEdit = useUiStore((s) => s.openTableEdit);
  const openTableCreate = useUiStore((s) => s.openTableCreate);
  const setFlow = useDiagramStore((s) => s.setFlow);
  const initialFitDone = useRef(false);
  const layoutEntryRef = useRef<string | null>(null);
  const nodesRef = useRef(storeNodes);

  useEffect(() => {
    initialFitDone.current = false;
  }, [projectRoot]);

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
  const pendingViewport = useDiagramViewStore((s) => s.pendingViewport);
  const setPendingViewport = useDiagramViewStore((s) => s.setPendingViewport);

  const { fitView, setViewport, getViewport, getNodes, getInternalNode } =
    useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const saveTimer = useRef<number | null>(null);
  const viewportTimer = useRef<number | null>(null);
  const [contextMenu, setContextMenu] =
    useState<DiagramContextMenuState | null>(null);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      const hasPositionOrDimensionChange = changes.some(
        (c) => c.type === "position" || c.type === "dimensions",
      );
      if (!hasPositionOrDimensionChange) {
        return;
      }
      setNodes((current) => {
        if (!current.some(isGroupNode)) {
          return current;
        }
        for (const change of changes) {
          if (
            change.type === "position" &&
            change.position &&
            isGroupNode({ id: change.id } as Node)
          ) {
            const prevGroup = nodesRef.current.find((n) => n.id === change.id);
            const groupData = prevGroup?.data as TableGroupNodeData | undefined;
            const memberIds = new Set(groupData?.group?.tableIds ?? []);
            if (prevGroup && memberIds.size > 0) {
              const dx = change.position.x - prevGroup.position.x;
              const dy = change.position.y - prevGroup.position.y;
              if (dx !== 0 || dy !== 0) {
                const shifted = current.map((n) =>
                  memberIds.has(n.id)
                    ? {
                        ...n,
                        position: {
                          x: n.position.x + dx,
                          y: n.position.y + dy,
                        },
                      }
                    : n,
                );
                return syncTableGroupBounds(shifted);
              }
            }
          }
        }
        return syncTableGroupBounds(current);
      });
    },
    [onNodesChange, setNodes],
  );

  const layout = useDiagramAutoLayout({
    nodes: storeNodes,
    edges: storeEdges,
    fitView,
  });
  const { runLayout, isRunning, canRun, canRunSelection } = layout;

  const largeDiagram = isLargeDiagram(storeNodes.length, storeEdges.length);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges]);

  useEffect(() => {
    registerDiagramExportApi({
      getNodes,
      getEdges: () => edges,
      getInternalNode,
    });
    return () => registerDiagramExportApi(null);
  }, [getNodes, getInternalNode, edges]);

  useEffect(() => {
    if (!pendingViewport || storeNodes.length === 0) {
      return;
    }
    void setViewport(pendingViewport, { duration: 0 });
    setPendingViewport(null);
    initialFitDone.current = true;
  }, [pendingViewport, storeNodes.length, setViewport, setPendingViewport]);

  useEffect(() => {
    if (
      initialFitDone.current ||
      pendingViewport ||
      storeNodes.length === 0
    ) {
      return;
    }
    initialFitDone.current = true;
    requestAnimationFrame(() => {
      void fitView({ padding: 0.12, duration: largeDiagram ? 0 : 200 });
    });
  }, [
    storeNodes.length,
    pendingViewport,
    fitView,
    largeDiagram,
  ]);

  const highlightTableId = largeDiagram
    ? selectedTableId
    : (hoveredTableId ?? selectedTableId);
  /** Flow animation and labels are selection-only — hover highlight is cheaper. */
  const flowTableId = selectedTableId;

  const query = searchQuery.trim().toLowerCase();
  const relationFocusActive =
    emphasizeRelated && selectedTableId !== null;

  const relatedIds = useMemo(
    () =>
      selectedTableId
        ? buildRelatedTableIds(selectedTableId, edges)
        : null,
    [selectedTableId, edges],
  );

  const searchVisibleIds = useMemo(() => {
    if (!query || !hideUnmatchedSearch) {
      return null;
    }
    const ids = new Set<string>();
    for (const node of nodes) {
      if (nodeMatchesSearch(node, query)) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [nodes, query, hideUnmatchedSearch]);

  const displayNodes = useMemo(() => {
    const needsSearchStyling = Boolean(query);
    const needsRelationDimming =
      relationFocusActive && relatedIds !== null;

    if (!needsSearchStyling && !needsRelationDimming) {
      return nodes;
    }

    let visibleNodes: Node[] = nodes;

    if (query) {
      const matchedTableIds = new Set(
        nodes
          .filter((n) => !isGroupNode(n) && nodeMatchesSearch(n, query))
          .map((n) => n.id),
      );
      const nodeMatchesOrHasMember = (node: Node) => {
        if (!isGroupNode(node)) {
          return matchedTableIds.has(node.id);
        }
        const group = (node.data as TableGroupNodeData).group;
        return (
          nodeMatchesSearch(node, query) ||
          (group?.tableIds ?? []).some((id) => matchedTableIds.has(id))
        );
      };
      if (hideUnmatchedSearch) {
        visibleNodes = nodes.filter(nodeMatchesOrHasMember);
      } else {
        visibleNodes = nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            dimmed: !nodeMatchesOrHasMember(node),
          },
        }));
      }
    } else {
      visibleNodes = nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          dimmed: false,
        },
      }));
    }

    if (needsRelationDimming) {
      visibleNodes = visibleNodes.map((node) => {
        const inRelated = isGroupNode(node)
          ? ((node.data as TableGroupNodeData).group?.tableIds ?? []).some(
              (id) => relatedIds.has(id),
            )
          : relatedIds.has(node.id);
        const prevDimmed = (node.data as { dimmed?: boolean }).dimmed ?? false;
        return {
          ...node,
          data: {
            ...node.data,
            dimmed: prevDimmed || !inRelated,
          },
        };
      });
    }

    return visibleNodes;
  }, [
    nodes,
    query,
    hideUnmatchedSearch,
    relatedIds,
    relationFocusActive,
  ]);

  const displayEdges = useMemo(() => {
    const needsEdgeDecor =
      searchVisibleIds !== null ||
      relationFocusActive ||
      highlightTableId !== null ||
      (showEdgeLabels && flowTableId !== null) ||
      animateRelationships;
    if (!needsEdgeDecor) {
      return edges;
    }

    return edges.map((edge) => {
      const hiddenBySearch =
        searchVisibleIds !== null &&
        (!searchVisibleIds.has(edge.source) ||
          !searchVisibleIds.has(edge.target));
      const dimmedByRelation =
        relationFocusActive &&
        relatedIds !== null &&
        (!relatedIds.has(edge.source) || !relatedIds.has(edge.target));
      const isHighlightedEdge =
        highlightTableId !== null &&
        (edge.source === highlightTableId || edge.target === highlightTableId);
      const isFlowEdge =
        flowTableId !== null &&
        (edge.source === flowTableId || edge.target === flowTableId);
      return {
        ...edge,
        hidden: Boolean(hiddenBySearch),
        data: {
          ...edge.data,
          showLabels: showEdgeLabels && isFlowEdge,
          dimmed: Boolean(dimmedByRelation),
          highlighted: isHighlightedEdge,
          animate:
            animateRelationships && isFlowEdge && !dimmedByRelation,
        },
      };
    });
  }, [
    edges,
    searchVisibleIds,
    relatedIds,
    selectedTableId,
    highlightTableId,
    flowTableId,
    showEdgeLabels,
    animateRelationships,
    relationFocusActive,
  ]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (isGroupNode(node)) {
        const group = (node.data as TableGroupNodeData).group;
        if (group && group.tableIds.length > 0) {
          void fitView({
            nodes: group.tableIds.map((id) => ({ id })),
            padding: 0.3,
            duration: 280,
          });
        }
        return;
      }
      if (selectedTableId === node.id) {
        selectTable(null);
        return;
      }
      selectTable(node.id);
    },
    [selectTable, selectedTableId, fitView],
  );

  const onPaneClick = useCallback(() => {
    selectTable(null);
    setHoveredTable(null);
  }, [selectTable, setHoveredTable]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, tableId: null });
    },
    [],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (isGroupNode(node)) {
        setContextMenu({ x: event.clientX, y: event.clientY, tableId: null });
        return;
      }
      selectTable(node.id);
      setContextMenu({ x: event.clientX, y: event.clientY, tableId: node.id });
    },
    [selectTable],
  );

  const focusTable = useCallback(
    (tableId: string) => {
      void fitView({
        nodes: [{ id: tableId }],
        padding: 0.5,
        duration: 300,
      });
    },
    [fitView],
  );

  const editTable = useCallback(
    (tableId: string) => {
      selectTable(tableId);
      openTableEdit();
    },
    [selectTable, openTableEdit],
  );

  const newTable = useCallback(() => openTableCreate(), [openTableCreate]);

  const addTableToGroup = useCallback(
    (tableId: string, target: AddToGroupTarget) => {
      const { model } = useDiagramStore.getState();
      const table = model?.tables.find((t) => t.id === tableId);
      if (!table) {
        return;
      }
      if (target.kind === "existing") {
        const group = model?.tableGroups?.find((g) => g.id === target.groupId);
        if (!group) {
          return;
        }
        void applyAssignTableToGroup(table, group, projectFiles);
        return;
      }
      void applyAssignTableToGroup(
        table,
        { name: target.name, schema: table.schema },
        projectFiles,
      );
    },
    [projectFiles],
  );

  const removeTableFromGroup = useCallback(
    (tableId: string) => {
      const table = useDiagramStore
        .getState()
        .model?.tables.find((t) => t.id === tableId);
      if (!table) {
        return;
      }
      void applyAssignTableToGroup(table, null, projectFiles);
    },
    [projectFiles],
  );

  const hoverFrame = useRef<number | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const onNodeMouseEnter = useCallback(
    (_: unknown, node: Node) => {
      if (largeDiagram || isGroupNode(node)) {
        return;
      }
      if (hoveredRef.current === node.id) {
        return;
      }
      hoveredRef.current = node.id;
      if (hoverFrame.current !== null) {
        cancelAnimationFrame(hoverFrame.current);
      }
      hoverFrame.current = requestAnimationFrame(() => {
        hoverFrame.current = null;
        setHoveredTable(node.id);
      });
    },
    [setHoveredTable, largeDiagram],
  );

  const onNodeMouseLeave = useCallback(() => {
    if (largeDiagram) {
      return;
    }
    hoveredRef.current = null;
    if (hoverFrame.current !== null) {
      cancelAnimationFrame(hoverFrame.current);
      hoverFrame.current = null;
    }
    setHoveredTable(null);
  }, [setHoveredTable, largeDiagram]);

  const persistLayoutForEntry = useCallback(
    (relativeEntry: string, snapshot: Node[]) => {
      if (!projectRoot) {
        return;
      }
      const viewport = getViewport();
      void saveDiagramLayout(
        relativeEntry,
        layoutFromNodes(snapshot, viewport),
      );
    },
    [projectRoot, getViewport],
  );

  useEffect(() => {
    const previousEntry = layoutEntryRef.current;
    if (
      previousEntry &&
      entryPoint &&
      previousEntry !== entryPoint &&
      projectRoot
    ) {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      persistLayoutForEntry(previousEntry, nodesRef.current);
    }
    layoutEntryRef.current = entryPoint ?? null;
    initialFitDone.current = false;
  }, [entryPoint, projectRoot, persistLayoutForEntry]);

  const persistLayout = useCallback(() => {
    const relativeEntry = layoutEntryRef.current ?? entryPoint;
    if (!relativeEntry || !projectRoot) {
      return;
    }
    persistLayoutForEntry(relativeEntry, nodes);
  }, [entryPoint, projectRoot, nodes, persistLayoutForEntry]);

  const onNodeDragStop = useCallback(() => {
    setFlow(nodes, edges);
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(persistLayout, 400);
  }, [nodes, edges, setFlow, persistLayout]);

  const onMoveEnd = useCallback(() => {
    if (!projectRoot) {
      return;
    }
    if (viewportTimer.current) {
      window.clearTimeout(viewportTimer.current);
    }
    viewportTimer.current = window.setTimeout(persistLayout, 500);
  }, [projectRoot, persistLayout]);

  const focusSearch = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return;
    }
    const matching = nodes.filter((n) => nodeMatchesSearch(n, q)).map((n) => n.id);
    if (matching.length === 0) {
      return;
    }
    void fitView({
      nodes: matching.map((id) => ({ id })),
      padding: 0.25,
      duration: 300,
    });
  }, [searchQuery, nodes, fitView]);

  const focusSelection = useCallback(() => {
    if (!selectedTableId) {
      return;
    }
    void fitView({
      nodes: [{ id: selectedTableId }],
      padding: 0.5,
      duration: 300,
    });
  }, [selectedTableId, fitView]);

  return (
    <>
      {isStale && (
        <div className="stale-banner">Showing last valid schema — fix parse errors to refresh.</div>
      )}
      <DiagramToolbar
        onFocusSearch={focusSearch}
        onFocusSelection={focusSelection}
        layout={layout}
      />
      <div className="diagram-canvas">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodeDragStop={onNodeDragStop}
          onMoveEnd={onMoveEnd}
          nodesDraggable
          snapToGrid={snapToGrid}
          snapGrid={[16, 16]}
          minZoom={0.08}
          maxZoom={2}
          onlyRenderVisibleElements
          elevateNodesOnSelect={false}
          autoPanOnNodeFocus={false}
          proOptions={{ hideAttribution: true }}
        >
          <RelationshipEdgeMarkers />
          {showGrid && (
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          )}
          {showMinimap && (
            <MiniMap
              pannable
              zoomable
              className="diagram-minimap"
              maskColor="color-mix(in srgb, var(--bg-app) 65%, transparent)"
            />
          )}
          {showControls && <Controls showInteractive={false} />}
        </ReactFlow>
      </div>
      {contextMenu && (
        <DiagramContextMenu
          state={contextMenu}
          isRunning={isRunning}
          canRun={canRun}
          canRunSelection={canRunSelection}
          onRunLayout={runLayout}
          onFitView={() => fitView({ padding: 0.15, duration: 280 })}
          onFocusTable={focusTable}
          onEditTable={editTable}
          onNewTable={newTable}
          onAddToGroup={addTableToGroup}
          onRemoveFromGroup={removeTableFromGroup}
          onClose={closeContextMenu}
        />
      )}
    </>
  );
}

export function SchemaDiagram() {
  const projectRoot = useProjectStore((s) => s.projectRoot);

  if (!projectRoot) {
    return (
      <div className="panel panel-fill panel-flush">
        <div className="diagram-canvas workspace-empty">
          <p className="empty-hint">
            Diagram preview appears when a project is open.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel panel-fill panel-flush">
      <ReactFlowProvider>
        <DiagramFlow />
      </ReactFlowProvider>
    </div>
  );
}
