import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";
import { mergeFlowNodes } from "../features/schema/merge-flow-nodes";
import type { Diagnostic } from "../types/diagnostics";
import type { SchemaModel, SchemaTable } from "../types/schema";

interface DiagramState {
  model: SchemaModel | null;
  lastValidModel: SchemaModel | null;
  isStale: boolean;
  diagnostics: Diagnostic[];
  nodes: Node[];
  edges: Edge[];
  selectedTableId: string | null;
  hoveredTableId: string | null;
  searchQuery: string;
  parseGeneration: number;
  setParseResult: (
    generation: number,
    result: {
      model: SchemaModel | null;
      diagnostics: Diagnostic[];
    },
  ) => void;
  setFlow: (nodes: Node[], edges: Edge[]) => void;
  selectTable: (tableId: string | null) => void;
  setHoveredTable: (tableId: string | null) => void;
  setSearchQuery: (query: string) => void;
  bumpParseGeneration: () => number;
  selectedTable: () => SchemaTable | null;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  model: null,
  lastValidModel: null,
  isStale: false,
  diagnostics: [],
  nodes: [],
  edges: [],
  selectedTableId: null,
  hoveredTableId: null,
  searchQuery: "",
  parseGeneration: 0,

  bumpParseGeneration: () => {
    const next = get().parseGeneration + 1;
    set({ parseGeneration: next });
    return next;
  },

  setParseResult: (generation, result) => {
    if (generation !== get().parseGeneration) {
      return;
    }
    if (result.model) {
      set({
        model: result.model,
        lastValidModel: result.model,
        isStale: false,
        diagnostics: result.diagnostics,
      });
    } else {
      set({
        model: null,
        isStale: get().lastValidModel !== null,
        diagnostics: result.diagnostics,
      });
    }
  },

  setFlow: (nodes, edges) =>
    set((state) => ({
      nodes: mergeFlowNodes(state.nodes, nodes),
      edges,
    })),

  selectTable: (tableId) => set({ selectedTableId: tableId }),

  setHoveredTable: (tableId) => set({ hoveredTableId: tableId }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  selectedTable: () => {
    const { lastValidModel, selectedTableId } = get();
    if (!lastValidModel || !selectedTableId) {
      return null;
    }
    return (
      lastValidModel.tables.find((t) => t.id === selectedTableId) ?? null
    );
  },
}));
