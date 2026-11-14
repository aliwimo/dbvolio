import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

type ExportKind = "sql" | "svg" | "png" | "pdf";

const FILTERS: Record<ExportKind, { name: string; extensions: string[] }[]> = {
  sql: [{ name: "SQL", extensions: ["sql"] }],
  svg: [{ name: "SVG", extensions: ["svg"] }],
  png: [{ name: "PNG", extensions: ["png"] }],
  pdf: [{ name: "PDF", extensions: ["pdf"] }],
};

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function browserDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function saveExportBlob(
  defaultFilename: string,
  blob: Blob,
  kind: ExportKind,
): Promise<boolean> {
  if (!isTauri()) {
    await browserDownload(defaultFilename, blob);
    return true;
  }

  const path = await save({
    defaultPath: defaultFilename,
    title: "Export file",
    filters: FILTERS[kind],
  });
  if (!path) {
    return false;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  await invoke("write_export_file", {
    path,
    data: Array.from(bytes),
  });
  return true;
}

export async function saveExportText(
  defaultFilename: string,
  text: string,
  kind: ExportKind,
): Promise<boolean> {
  return saveExportBlob(
    defaultFilename,
    new Blob([text], { type: "text/plain;charset=utf-8" }),
    kind,
  );
}
