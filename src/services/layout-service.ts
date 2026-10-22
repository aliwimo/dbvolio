import type { Node } from "@xyflow/react";
import {
  EMPTY_LAYOUT,
  LEGACY_LAYOUT_KEY,
  type DiagramLayout,
  type LayoutMetadata,
  type LayoutNodePosition,
  type LayoutViewport,
} from "../types/layout";
import { readLayoutMetadata, writeLayoutMetadata } from "./tauri-bridge";
import { applyDagreLayout } from "../features/diagram-layout/dagre-layout";
import {
  isGroupNode,
  syncTableGroupBounds,
} from "../features/diagram-layout/table-group-bounds";
import { useDiagramViewStore } from "../stores/diagram-view-store";

type ParsedLayoutFile = {
  version?: number;
  diagrams?: Record<string, DiagramLayout>;
  nodes?: Record<string, LayoutNodePosition>;
  viewport?: LayoutViewport;
};

export function normalizeLayoutMetadata(raw: unknown): LayoutMetadata {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_LAYOUT, diagrams: {} };
  }
  const parsed = raw as ParsedLayoutFile;
  if (parsed.version === 2 && parsed.diagrams && typeof parsed.diagrams === "object") {
    return {
      version: 2,
      diagrams: { ...parsed.diagrams },
    };
  }
  if (parsed.version === 1 && parsed.nodes && typeof parsed.nodes === "object") {
    return {
      version: 2,
      diagrams: {
        [LEGACY_LAYOUT_KEY]: {
          nodes: { ...parsed.nodes },
          viewport: parsed.viewport,
        },
      },
    };
  }
  return { ...EMPTY_LAYOUT, diagrams: {} };
}

export function getDiagramLayout(
  metadata: LayoutMetadata,
  entryPoint: string,
): DiagramLayout {
  const direct = metadata.diagrams[entryPoint];
  if (direct) {
    return {
      nodes: { ...direct.nodes },
      viewport: direct.viewport ? { ...direct.viewport } : undefined,
    };
  }
  const legacy = metadata.diagrams[LEGACY_LAYOUT_KEY];
  if (legacy) {
    return {
      nodes: { ...legacy.nodes },
      viewport: legacy.viewport ? { ...legacy.viewport } : undefined,
    };
  }
  return { nodes: {} };
}

export async function loadLayoutMetadata(): Promise<LayoutMetadata> {
  const raw = await readLayoutMetadata();
  if (!raw) {
    return { ...EMPTY_LAYOUT, diagrams: {} };
  }
  try {
    return normalizeLayoutMetadata(JSON.parse(raw) as unknown);
  } catch {
    return { ...EMPTY_LAYOUT, diagrams: {} };
  }
}

export async function saveLayoutMetadata(metadata: LayoutMetadata): Promise<void> {
  await writeLayoutMetadata(JSON.stringify(metadata, null, 2));
}

export async function saveDiagramLayout(
  entryPoint: string,
  diagram: DiagramLayout,
): Promise<void> {
  const metadata = await loadLayoutMetadata();
  metadata.diagrams[entryPoint] = {
    nodes: { ...diagram.nodes },
    viewport: diagram.viewport ? { ...diagram.viewport } : undefined,
  };
  if (metadata.diagrams[LEGACY_LAYOUT_KEY] && entryPoint !== LEGACY_LAYOUT_KEY) {
    delete metadata.diagrams[LEGACY_LAYOUT_KEY];
  }
  await saveLayoutMetadata(metadata);
}

export function mergeLayoutWithNodes(
  nodes: Node[],
  savedNodes: Record<string, LayoutNodePosition>,
): Node[] {
  const positioned = nodes.map((node) => {
    if (isGroupNode(node)) {
      return node;
    }
    const saved = savedNodes[node.id];
    if (saved) {
      return {
        ...node,
        position: { x: saved.x, y: saved.y },
      };
    }
    return node;
  });

  const missing = positioned.filter(
    (n) => !isGroupNode(n) && !savedNodes[n.id],
  );
  if (missing.length === 0) {
    return syncTableGroupBounds(positioned);
  }

  const rankdir = useDiagramViewStore.getState().layoutDirection;
  const laidOut = applyDagreLayout(missing, [], rankdir);
  const laidOutById = new Map(laidOut.map((n) => [n.id, n]));
  return syncTableGroupBounds(
    positioned.map((node) => laidOutById.get(node.id) ?? node),
  );
}

export function layoutFromNodes(
  nodes: Node[],
  viewport?: LayoutViewport,
): DiagramLayout {
  const nodePositions: Record<string, LayoutNodePosition> = {};
  for (const node of nodes) {
    if (isGroupNode(node)) {
      continue;
    }
    nodePositions[node.id] = { x: node.position.x, y: node.position.y };
  }
  return {
    nodes: nodePositions,
    viewport,
  };
}
