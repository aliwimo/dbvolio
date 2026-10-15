import type { Edge, Node } from "@xyflow/react";
import type { InternalNode } from "@xyflow/react";
import {
  buildDiagramSvg,
  svgStringToPdfBlob,
  svgStringToPngBlob,
} from "./diagram-vector-export";

export type DiagramExportApi = {
  getNodes: () => Node[];
  getEdges: () => Edge[];
  getInternalNode: (id: string) => InternalNode | undefined;
};

let diagramExportApi: DiagramExportApi | null = null;

export function registerDiagramExportApi(api: DiagramExportApi | null): void {
  diagramExportApi = api;
}

function requireExportInput() {
  if (!diagramExportApi) {
    throw new Error("Diagram is still loading. Try again in a moment.");
  }
  const nodes = diagramExportApi.getNodes();
  const edges = diagramExportApi.getEdges();
  if (nodes.length === 0) {
    throw new Error("No tables to export.");
  }
  return {
    nodes,
    edges,
    getInternalNode: diagramExportApi.getInternalNode,
  };
}

export async function captureDiagramSvgBlob(): Promise<Blob> {
  const input = requireExportInput();
  const svg = buildDiagramSvg(input);
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
}

export async function captureDiagramPngBlob(): Promise<Blob> {
  const input = requireExportInput();
  const svg = buildDiagramSvg(input);
  return svgStringToPngBlob(svg, 2);
}

export async function captureDiagramPdfBlob(): Promise<Blob> {
  const input = requireExportInput();
  const svg = buildDiagramSvg(input);
  return svgStringToPdfBlob(svg);
}
