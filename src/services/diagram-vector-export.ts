import { invoke, isTauri } from "@tauri-apps/api/core";
import type { jsPDF } from "jspdf";
import type { Edge, Node } from "../types/flow";
import {
  TABLE_COLUMNS_PADDING,
  TABLE_HEADER_HEIGHT,
  TABLE_NODE_WIDTH,
  TABLE_ROW_STRIDE,
} from "../features/diagram/relationship-edge-geometry";
import { diagramEdgeGeometry } from "../components/diagram/DiagramEdges";
import type { TableNodeData } from "../components/diagram/TableNode";
import {
  resolveGroupColor,
  type TableGroupNodeData,
} from "../components/diagram/TableGroupNode";
import { isGroupNode } from "../features/diagram-layout/table-group-bounds";

const TABLE_MIN_WIDTH = TABLE_NODE_WIDTH;
const HEADER_HEIGHT = TABLE_HEADER_HEIGHT;
const ROW_HEIGHT = TABLE_ROW_STRIDE;
const COLUMNS_PADDING = TABLE_COLUMNS_PADDING;
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

const COLOR_FALLBACKS = {
  background: "#f7f7f8",
  rowStripe: "transparent",
  panel: "#ffffff",
  border: "#ececee",
  text: "#1c1c1f",
  muted: "#73737c",
  edge: "#a7a7b0",
};

function channelByte(value: string, unit: "byte" | "unit"): number {
  const n = Number(value);
  const byte = unit === "unit" ? n * 255 : n;
  return Math.max(0, Math.min(255, Math.round(byte)));
}

function hexColor(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** svg2pdf only strokes `#rrggbb` and `rgb()`. Computed `color(srgb …)` is dropped. */
function svgPaintColor(resolved: string, fallback: string): string {
  const rgb = resolved.match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/,
  );
  if (rgb) {
    if (rgb[4] !== undefined && Number(rgb[4]) === 0) return "transparent";
    return hexColor(
      channelByte(rgb[1], "byte"),
      channelByte(rgb[2], "byte"),
      channelByte(rgb[3], "byte"),
    );
  }
  const srgb = resolved.match(
    /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/,
  );
  if (srgb) {
    if (srgb[4] !== undefined && Number(srgb[4]) === 0) return "transparent";
    return hexColor(
      channelByte(srgb[1], "unit"),
      channelByte(srgb[2], "unit"),
      channelByte(srgb[3], "unit"),
    );
  }
  if (/^#[0-9a-fA-F]{6}$/.test(resolved)) return resolved.toLowerCase();
  return fallback;
}

function paintedColor(css: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.color = css;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  if (!resolved || resolved === "rgba(0, 0, 0, 0)") {
    return css.includes("transparent") ? "transparent" : fallback;
  }
  return svgPaintColor(resolved, fallback);
}

function exportColors() {
  return {
    background: paintedColor("var(--bg-app)", COLOR_FALLBACKS.background),
    rowStripe: paintedColor("var(--table-row-stripe)", COLOR_FALLBACKS.rowStripe),
    panel: paintedColor("var(--bg-panel)", COLOR_FALLBACKS.panel),
    border: paintedColor("var(--border)", COLOR_FALLBACKS.border),
    text: paintedColor("var(--text)", COLOR_FALLBACKS.text),
    muted: paintedColor("var(--text-muted)", COLOR_FALLBACKS.muted),
    edge: paintedColor(
      "color-mix(in srgb, var(--text-muted) 55%, var(--border-strong))",
      COLOR_FALLBACKS.edge,
    ),
  };
}

type ExportColors = ReturnType<typeof exportColors>;

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

function renderTableGroupNode(
  node: Node,
  internal: InternalNodeLike | undefined,
  colors: ExportColors,
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
    ? `<text x="${x + 14}" y="${y + 42}" font-size="11" font-weight="400" fill="${colors.muted}">${escapeXml(group.note.split("\n")[0])}</text>`
    : "";

  return `<g>
<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${color}" fill-opacity="0.07" stroke="${color}" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="5 4"/>
<circle cx="${x + 18}" cy="${y + 20}" r="4.5" fill="${color}"/>
<text x="${x + 28}" y="${y + 24}" font-size="12" font-weight="600" fill="${colors.text}">${escapeXml(title)}</text>
${noteLine}
</g>`;
}

function renderTableNode(
  node: Node,
  internal: InternalNodeLike | undefined,
  colors: ExportColors,
  clipId: string,
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
      if (index % 2 === 0 || colors.rowStripe === "transparent") {
        return "";
      }
      const stripeY = y + HEADER_HEIGHT + COLUMNS_PADDING + index * ROW_HEIGHT;
      return `<rect x="${x}" y="${stripeY}" width="${width}" height="${ROW_HEIGHT}" fill="${colors.rowStripe}" stroke="none"/>`;
    })
    .join("\n");

  const rows = table.columns
    .map((col, index) => {
      const isFk =
        refSourceColumns?.has(col.name) || foreignKeys?.has(col.name);
      const badges = [
        col.isPrimaryKey ? `<tspan fill="${colors.muted}"> PK</tspan>` : "",
        isFk ? `<tspan fill="${colors.muted}"> FK</tspan>` : "",
      ].join("");
      const rowY =
        y +
        HEADER_HEIGHT +
        COLUMNS_PADDING +
        index * ROW_HEIGHT +
        ROW_HEIGHT * 0.68;
      return `<text x="${x + 14}" y="${rowY}" font-size="12" font-weight="400" fill="${colors.text}">${escapeXml(col.name)}${badges}</text>
<text x="${x + width - 14}" y="${rowY}" font-size="12" font-weight="400" fill="${colors.muted}" text-anchor="end">${escapeXml(col.type)}</text>`;
    })
    .join("\n");

  const headerFill = headerColor || colors.panel;

  return `<g>
<defs>
  <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10"/></clipPath>
</defs>
<g clip-path="url(#${clipId})">
<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${colors.panel}"/>
<rect x="${x}" y="${y}" width="${width}" height="${HEADER_HEIGHT}" fill="${headerFill}"/>
${rowStripes}
<line x1="${x}" y1="${y + HEADER_HEIGHT}" x2="${x + width}" y2="${y + HEADER_HEIGHT}" stroke="${colors.border}" stroke-width="1"/>
</g>
<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="none" stroke="${colors.border}" stroke-width="1"/>
<text x="${x + 12}" y="${y + 23}" font-size="13" font-weight="600" fill="${colors.text}">${escapeXml(title)}</text>
${rows}
</g>`;
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

  const colors = exportColors();
  const bounds = computeBounds(nodes, getInternalNode);
  const width = bounds.maxX - bounds.minX + CANVAS_PADDING * 2;
  const height = bounds.maxY - bounds.minY + CANVAS_PADDING * 2;
  const offsetX = -bounds.minX + CANVAS_PADDING;
  const offsetY = -bounds.minY + CANVAS_PADDING;

  const groupShapes = nodes
    .filter(isGroupNode)
    .map((node) => renderTableGroupNode(node, getInternalNode?.(node.id), colors))
    .filter(Boolean)
    .join("\n");

  const edgePaths = diagramEdgeGeometry(nodes, edges)
    .items.map((item) => {
      const line = item.d.replace(
        /Q\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/g,
        "L $1 $2 L $3 $4",
      );
      const marker = item.arrow.match(/M\s+([-\d.]+)\s+([-\d.]+)/);
      const dot = marker
        ? `<circle cx="${Number(marker[1]) + 2.5}" cy="${marker[2]}" r="2.5" fill="${colors.edge}"/>`
        : "";
      return `<path d="${line}" fill="none" stroke="${colors.edge}" stroke-width="1.5"/>\n${dot}`;
    })
    .join("\n");

  const tables = nodes
    .filter((node) => !isGroupNode(node))
    .map((node, index) =>
      renderTableNode(
        node,
        getInternalNode?.(node.id),
        colors,
        `diagram-export-table-${index}`,
      ),
    )
    .join("\n");

  const fontFamily = resolveExportFontFamily();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}">
  <style>
    text {
      font-family: ${fontFamily};
    }
  </style>
  <rect width="100%" height="100%" fill="${colors.background}"/>
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

type UiFontFile = { family: string; base64: string };

let uiFontLoad: Promise<UiFontFile | null> | null = null;

function loadUiFont(): Promise<UiFontFile | null> {
  if (!isTauri()) return Promise.resolve(null);
  if (!uiFontLoad) {
    uiFontLoad = invoke<UiFontFile | null>("read_ui_font").catch(() => null);
  }
  return uiFontLoad;
}

function svgTextSample(svg: string): string {
  const chars = new Set<string>();
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,_-()[]/→") {
    chars.add(ch);
  }
  for (const match of svg.matchAll(/>([^<]+)</g)) {
    const text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"');
    for (const ch of text) chars.add(ch);
  }
  return [...chars].join("");
}

function bytesToBase64(data: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Table headers are weight 600 at UI size. The system file is a variable font whose default is regular display. */
async function useUiFont(pdf: jsPDF, font: UiFontFile, svg: string): Promise<void> {
  const source = Uint8Array.from(atob(font.base64), (ch) => ch.charCodeAt(0));
  const sample = svgTextSample(svg);
  let regular = source;
  let semibold = source;
  try {
    const { default: subsetFont } = await import("subset-font");
    const instance = (wght: number) =>
      subsetFont(source, sample, {
        targetFormat: "sfnt",
        variationAxes: { wght, opsz: 17 },
      });
    regular = new Uint8Array(await instance(400));
    semibold = new Uint8Array(await instance(600));
  } catch {
    regular = source;
    semibold = source;
  }
  pdf.addFileToVFS("ui-regular.ttf", bytesToBase64(regular));
  pdf.addFileToVFS("ui-semibold.ttf", bytesToBase64(semibold));
  pdf.addFont("ui-regular.ttf", font.family, "normal");
  for (const style of ["600", "600normal", "bold"]) {
    pdf.addFont("ui-semibold.ttf", font.family, style);
  }
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

  svgEl.style.position = "fixed";
  svgEl.style.left = "-10000px";
  document.body.appendChild(svgEl);

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

  const uiFont = await loadUiFont();
  if (uiFont) {
    await useUiFont(pdf, uiFont, svg);
  }

  try {
    await svg2pdf(svgEl, pdf, { x: 0, y: 0, width, height });
  } finally {
    svgEl.remove();
  }

  const blob = pdf.output("blob");
  if (!(blob instanceof Blob)) {
    throw new Error("PDF encoding failed.");
  }
  return blob;
}
