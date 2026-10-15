import { ModelExporter, Parser } from "@dbml/core";
import {
  captureDiagramPdfBlob,
  captureDiagramPngBlob,
  captureDiagramSvgBlob,
} from "../../services/diagram-export";
import { parseProject } from "../../services/dbml-parser";
import {
  saveExportBlob,
  saveExportText,
} from "../../services/export-download";
import { useDiagramStore } from "../../stores/diagram-store";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { readProjectFile } from "../../services/tauri-bridge";

function projectAbsolutePath(projectRoot: string, relativePath: string): string {
  const root = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");
  const rel = relativePath.replace(/\\/g, "/").replace(/^\//, "");
  return `${root}/${rel}`;
}

async function collectProjectFiles(): Promise<Record<string, string>> {
  const { projectRoot, files, entryPoint } = useProjectStore.getState();
  if (!projectRoot || !entryPoint) {
    throw new Error("Open a project with an entry point first.");
  }
  const openContents = useEditorStore.getState().getOpenFileContents();
  const map: Record<string, string> = {};
  for (const file of files) {
    if (file.isDirectory || !file.relativePath.endsWith(".dbml")) {
      continue;
    }
    map[file.relativePath] =
      openContents[file.relativePath] ??
      (await readProjectFile(file.relativePath)).content;
  }
  return map;
}

async function runExport(label: string, action: () => Promise<boolean>) {
  try {
    const saved = await action();
    if (!saved) {
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    window.alert(`${label} failed: ${message}`);
  }
}

export async function exportSql(postgres = true): Promise<void> {
  await runExport("SQL export", async () => {
    const { projectRoot, entryPoint } = useProjectStore.getState();
    if (!projectRoot || !entryPoint) {
      throw new Error("Open a project with an entry point first.");
    }
    const files = await collectProjectFiles();
    const result = parseProject(projectRoot, files, entryPoint);
    if (!result.model) {
      throw new Error("Fix parse errors before exporting SQL.");
    }
    const parser = new Parser();
    for (const [rel, content] of Object.entries(files)) {
      parser.setDbmlSource(
        projectAbsolutePath(projectRoot, rel),
        content,
      );
    }
    const database = parser.parseDbmlProject(
      projectAbsolutePath(projectRoot, entryPoint),
    );
    const format = postgres ? "postgres" : "mysql";
    const sql = ModelExporter.export(database, format);
    return saveExportText("schema.sql", sql, "sql");
  });
}

export async function exportDiagramSvg(): Promise<void> {
  await runExport("SVG export", async () => {
    const blob = await captureDiagramSvgBlob();
    return saveExportBlob("diagram.svg", blob, "svg");
  });
}

export async function exportDiagramPng(): Promise<void> {
  await runExport("PNG export", async () => {
    const blob = await captureDiagramPngBlob();
    return saveExportBlob("diagram.png", blob, "png");
  });
}

export async function exportDiagramPdf(): Promise<void> {
  await runExport("PDF export", async () => {
    const blob = await captureDiagramPdfBlob();
    return saveExportBlob("diagram.pdf", blob, "pdf");
  });
}

export function getDiagramStats() {
  return useDiagramStore.getState().lastValidModel;
}
