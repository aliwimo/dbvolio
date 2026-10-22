import {
  getSmoothStepPath,
  Position,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { TableNodeData } from "../components/diagram/TableNode";
import {
  resolveGroupColor,
  type TableGroupNodeData,
} from "../components/diagram/TableGroupNode";
import { isGroupNode } from "../features/diagram-layout/table-group-bounds";

const TABLE_MIN_WIDTH = 220;
const HEADER_HEIGHT = 34;
const ROW_HEIGHT = 26;
const COLUMNS_PADDING = 4;
const CANVAS_PADDING = 48;

/** Matches `font-family` on `html, body` in theme.css */
const UI_SANS_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function resolveExportFontFamily(): string {
  if (typeof document !== "undefined") {
    const { fontFamily } = getComputedStyle(document.body);
    if (fontFamily) {
      return fontFamily;
    }
  }
  return UI_SANS_FONT_FAMILY;
}

const COLORS = {
  background: "#eef0f3",
  rowStripe: "#f6f7f9",
  panel: "#ffffff",
  elevated: "#fafbfc",
  border: "#e2e5ea",
  text: "#1a1d23",
  muted: "#6b7280",
  edge: "#b8bec8",
  accent: "#2563eb",
  warning: "#ca8a04",
};

type InternalNodeLike = {
  internals: {
    positionAbsolute: { x: number; y: number };
    handleBounds?: {
      source?: HandleLike[] | null;
      target?: HandleLike[] | null;
    };
  };
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
};

type HandleLike = {
  id?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  position?: Position;
};

export type DiagramVectorInput = {
  nodes: Node[];
  edges: Edge[];
  getInternalNode?: (id: string) => InternalNodeLike | undefined;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnFromHandle(handleId: string | null | undefined): string {
  if (!handleId) {
    return "";
  }
  const idx = handleId.indexOf(":");
  return idx >= 0 ? handleId.slice(idx + 1) : handleId;
}

function nodeDimensions(
  node: Node,
  internal?: InternalNodeLike,
): { width: number; height: number } {
  if (isGroupNode(node)) {
    const groupData = node.data as TableGroupNodeData;
    const width =
      internal?.measured?.width ??
      node.measured?.width ??
      node.width ??
      groupData.width ??
      320;
    const height =
      internal?.measured?.height ??
      node.measured?.height ??
      node.height ??
      groupData.height ??
      200;
    return { width: Number(width), height: Number(height) };
  }
  const data = node.data as TableNodeData;
  const columnCount = data.table?.columns?.length ?? 0;
  const fallbackHeight =
    HEADER_HEIGHT + COLUMNS_PADDING * 2 + columnCount * ROW_HEIGHT;
  const width =
    internal?.measured?.width ??
    node.measured?.width ??
    node.width ??
    TABLE_MIN_WIDTH;
  const height =
    internal?.measured?.height ??
    node.measured?.height ??
    node.height ??
    fallbackHeight;
  return { width: Number(width), height: Number(height) };
}

function nodeOrigin(
  node: Node,
  internal?: InternalNodeLike,
): { x: number; y: number } {
  if (internal) {
    return {
      x: internal.internals.positionAbsolute.x,
      y: internal.internals.positionAbsolute.y,
    };
  }
  return { x: node.position.x, y: node.position.y };
}

function handlePoint(
  node: Node,
  internal: InternalNodeLike | undefined,
  handleId: string | null | undefined,
  kind: "source" | "target",
): { x: number; y: number; position: Position } | null {
  const bounds = internal?.internals.handleBounds?.[kind];
  const handle = handleId
    ? bounds?.find((entry) => entry.id === handleId)
    : bounds?.[0];
  if (handle && internal) {
    const { x: ax, y: ay } = internal.internals.positionAbsolute;
    const hx = handle.x ?? 0;
    const hy = handle.y ?? 0;
    const hw = handle.width ?? 8;
    const hh = handle.height ?? 8;
    const position =
      handle.position ??
      (kind === "source" ? Position.Right : Position.Left);
    switch (position) {
      case Position.Right:
        return { x: ax + hx + hw, y: ay + hy + hh / 2, position };
      case Position.Left:
        return { x: ax + hx, y: ay + hy + hh / 2, position };
      case Position.Top:
        return { x: ax + hx + hw / 2, y: ay + hy, position };
      case Position.Bottom:
        return { x: ax + hx + hw / 2, y: ay + hy + hh, position };
      default:
        break;
    }
  }

  const origin = nodeOrigin(node, internal);
  const { width, height } = nodeDimensions(node, internal);
  const centerY = origin.y + height / 2;
  if (
    handleId === "source" ||
    handleId === "target" ||
    !handleId ||
    columnFromHandle(handleId) === handleId
  ) {
    if (kind === "source") {
      return { x: origin.x + width, y: centerY, position: Position.Right };
    }
    return { x: origin.x, y: centerY, position: Position.Left };
  }

  const columnName = columnFromHandle(handleId);
  const data = node.data as TableNodeData;
  const columnIndex = data.table.columns.findIndex((c) => c.name === columnName);
  if (columnIndex < 0) {
    if (kind === "source") {
      return { x: origin.x + width, y: centerY, position: Position.Right };
    }
    return { x: origin.x, y: centerY, position: Position.Left };
  }
  const rowCenterY =
    origin.y +
    HEADER_HEIGHT +
    COLUMNS_PADDING +
    columnIndex * ROW_HEIGHT +
    ROW_HEIGHT / 2;
  if (kind === "source") {
    return { x: origin.x + width, y: rowCenterY, position: Position.Right };
  }
  return { x: origin.x, y: rowCenterY, position: Position.Left };
}

function renderTableGroupNode(
  node: Node,
  internal: InternalNodeLike | undefined,
): string {
  const data = node.data as TableGroupNodeData;
  const group = data.group;
  if (!group || node.hidden) {
    return "";
  }
  const origin = nodeOrigin(node, internal);
  const { width, height } = nodeDimensions(node, internal);
  const color = resolveGroupColor(group);
  const title = group.schema ? `${group.schema}.${group.name}` : group.name;
  const x = origin.x;
  const y = origin.y;
  const noteLine = group.note
    ? `<text x="${x + 14}" y="${y + 42}" font-size="11" fill="${COLORS.muted}">${escapeXml(group.note.split("\n")[0])}</text>`
    : "";

  return `<g>
<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${color}" fill-opacity="0.07" stroke="${color}" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="5 4"/>
<circle cx="${x + 18}" cy="${y + 20}" r="4.5" fill="${color}"/>
<text x="${x + 28}" y="${y + 24}" font-size="12" font-weight="600" fill="${COLORS.text}">${escapeXml(title)}</text>
${noteLine}
</g>`;
}

function renderTableNode(
  node: Node,
  internal: InternalNodeLike | undefined,
): string {
  const data = node.data as TableNodeData;
  const { table, foreignKeys, refSourceColumns } = data;
  const headerColor = data.headerColor ?? table.headerColor;
  const origin = nodeOrigin(node, internal);
  const { width, height } = nodeDimensions(node, internal);
  const title = `${table.schema ? `${table.schema}.` : ""}${table.name}`;
  const x = origin.x;
  const y = origin.y;

  const rowStripes = table.columns
    .map((_, index) => {
      if (index % 2 === 0) {
        return "";
      }
      const stripeY = y + HEADER_HEIGHT + COLUMNS_PADDING + index * ROW_HEIGHT;
      return `<rect x="${x}" y="${stripeY}" width="${width}" height="${ROW_HEIGHT}" fill="${COLORS.rowStripe}" stroke="none"/>`;
    })
    .join("\n");

  const rows = table.columns
    .map((col, index) => {
      const isFk =
        refSourceColumns?.has(col.name) || foreignKeys?.has(col.name);
      const badges = [
        col.isPrimaryKey ? `<tspan fill="${COLORS.accent}"> PK</tspan>` : "",
        isFk ? `<tspan fill="${COLORS.warning}"> FK</tspan>` : "",
      ].join("");
      const rowY =
        y +
        HEADER_HEIGHT +
        COLUMNS_PADDING +
        index * ROW_HEIGHT +
        ROW_HEIGHT * 0.68;
      return `<text x="${x + 14}" y="${rowY}" font-size="12" fill="${COLORS.text}">${escapeXml(col.name)}${badges}</text>
<text x="${x + width - 14}" y="${rowY}" font-size="12" fill="${COLORS.muted}" text-anchor="end">${escapeXml(col.type)}</text>`;
    })
    .join("\n");

  const headerFill = headerColor || COLORS.elevated;
  const headerTextColor = headerColor ? "#ffffff" : COLORS.text;

  return `<g>
<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${COLORS.panel}" stroke="${COLORS.border}" stroke-width="1"/>
<rect x="${x}" y="${y}" width="${width}" height="${HEADER_HEIGHT}" rx="8" fill="${headerFill}" stroke="none"/>
<line x1="${x}" y1="${y + HEADER_HEIGHT}" x2="${x + width}" y2="${y + HEADER_HEIGHT}" stroke="${COLORS.border}" stroke-width="1"/>
<text x="${x + 12}" y="${y + 22}" font-size="12" font-weight="600" fill="${headerTextColor}">${escapeXml(title)}</text>
${rowStripes}
${rows}
</g>`;
}

function renderRelationshipEdge(
  edge: Edge,
  nodeById: Map<string, Node>,
  getInternalNode?: (id: string) => InternalNodeLike | undefined,
): string | null {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);
  if (!sourceNode || !targetNode) {
    return null;
  }
  const sourceInternal = getInternalNode?.(edge.source);
  const targetInternal = getInternalNode?.(edge.target);
  const source = handlePoint(
    sourceNode,
    sourceInternal,
    edge.sourceHandle,
    "source",
  );
  const target = handlePoint(
    targetNode,
    targetInternal,
    edge.targetHandle,
    "target",
  );
  if (!source || !target) {
    return null;
  }
  const [path] = getSmoothStepPath({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
    sourcePosition: source.position,
    targetPosition: target.position,
    borderRadius: 14,
  });
  return `<path d="${path}" fill="none" stroke="${COLORS.edge}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#diagram-export-arrow)"/>`;
}

function computeBounds(
  nodes: Node[],
  getInternalNode?: (id: string) => InternalNodeLike | undefined,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const internal = getInternalNode?.(node.id);
    const origin = nodeOrigin(node, internal);
    const { width, height } = nodeDimensions(node, internal);
    minX = Math.min(minX, origin.x);
    minY = Math.min(minY, origin.y);
    maxX = Math.max(maxX, origin.x + width);
    maxY = Math.max(maxY, origin.y + height);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }
  return { minX, minY, maxX, maxY };
}

export function buildDiagramSvg(input: DiagramVectorInput): string {
  const { nodes, edges, getInternalNode } = input;
  if (nodes.length === 0) {
    throw new Error("No tables to export.");
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const bounds = computeBounds(nodes, getInternalNode);
  const width = bounds.maxX - bounds.minX + CANVAS_PADDING * 2;
  const height = bounds.maxY - bounds.minY + CANVAS_PADDING * 2;
  const offsetX = -bounds.minX + CANVAS_PADDING;
  const offsetY = -bounds.minY + CANVAS_PADDING;

  const groupShapes = nodes
    .filter(isGroupNode)
    .map((node) => renderTableGroupNode(node, getInternalNode?.(node.id)))
    .filter(Boolean)
    .join("\n");

  const edgePaths = edges
    .map((edge) => renderRelationshipEdge(edge, nodeById, getInternalNode))
    .filter((path): path is string => Boolean(path))
    .join("\n");

  const tables = nodes
    .filter((node) => !isGroupNode(node))
    .map((node) => renderTableNode(node, getInternalNode?.(node.id)))
    .join("\n");

  const fontFamily = resolveExportFontFamily();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}">
  <style>
    text {
      font-family: ${fontFamily};
    }
  </style>
  <defs>
    <marker id="diagram-export-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${COLORS.edge}"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="${COLORS.background}"/>
  <g transform="translate(${offsetX} ${offsetY})">
    ${groupShapes}
    ${edgePaths}
    ${tables}
  </g>
</svg>`;
}

export async function svgStringToPngBlob(
  svg: string,
  pixelRatio = 2,
): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const svgEl = doc.documentElement;
  const width = Number(svgEl.getAttribute("width") ?? 800);
  const height = Number(svgEl.getAttribute("height") ?? 600);

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width * pixelRatio);
      canvas.height = Math.ceil(height * pixelRatio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create PNG canvas."));
        return;
      }
      ctx.scale(pixelRatio, pixelRatio);
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("PNG encoding failed."));
            return;
          }
          resolve(blob);
        },
        "image/png",
        1,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize diagram SVG."));
    };
    image.src = url;
  });
}

export async function svgStringToPdfBlob(svg: string): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid diagram SVG.");
  }
  const svgEl = doc.documentElement;
  if (!(svgEl instanceof SVGSVGElement)) {
    throw new Error("Invalid diagram SVG root.");
  }

  const width = Number(svgEl.getAttribute("width") ?? 800);
  const height = Number(svgEl.getAttribute("height") ?? 600);

  const [{ jsPDF }, { svg2pdf }] = await Promise.all([
    import("jspdf"),
    import("svg2pdf.js"),
  ]);

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: [width, height],
  });

  await svg2pdf(svgEl, pdf, { x: 0, y: 0, width, height });

  const blob = pdf.output("blob");
  if (!(blob instanceof Blob)) {
    throw new Error("PDF encoding failed.");
  }
  return blob;
}
