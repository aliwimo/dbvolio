import {
  ChevronDown,
  Download,
  FileCode,
  FileImage,
  FileText,
  Image,
} from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import {
  exportDiagramPdf,
  exportDiagramPng,
  exportDiagramSvg,
  exportSql,
} from "../../features/export/export-actions";
import { useProjectStore } from "../../features/projects/project-store";
import { Button } from "../../shared/ui";

export function ExportMenu() {
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const [open, setOpen] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  let wrapRef: HTMLDivElement | undefined;

  const canExport = () => Boolean(projectRoot() && entryPoint());

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open()) return;
      if (wrapRef && !wrapRef.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    onCleanup(() => document.removeEventListener("mousedown", onDocClick));
  });

  const run = (action: () => Promise<void>) => {
    setBusy(true);
    void action().finally(() => {
      setBusy(false);
      setOpen(false);
    });
  };

  return (
    <div class="header-dropdown" ref={wrapRef}>
      <div class="header-dropdown-trigger">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canExport() || busy()}
          aria-label="Export"
          aria-expanded={open()}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Download size={15} />
          <span class="header-btn-label">Export</span>
          <ChevronDown size={14} class="header-dropdown-caret" />
        </Button>
      </div>
      <Show when={open() && canExport()}>
        <div class="header-dropdown-menu" role="menu">
          <button
            type="button"
            class="header-dropdown-item"
            role="menuitem"
            disabled={busy()}
            onClick={() => run(() => exportSql(true))}
          >
            <FileCode size={15} aria-hidden />
            <span class="header-dropdown-item-label">Export SQL (PostgreSQL)…</span>
          </button>
          <button
            type="button"
            class="header-dropdown-item"
            role="menuitem"
            disabled={busy()}
            onClick={() => run(() => exportSql(false))}
          >
            <FileText size={15} aria-hidden />
            <span class="header-dropdown-item-label">Export SQL (MySQL)…</span>
          </button>
          <div class="header-dropdown-divider" role="separator" />
          <button
            type="button"
            class="header-dropdown-item"
            role="menuitem"
            disabled={busy()}
            onClick={() => run(exportDiagramSvg)}
          >
            <FileImage size={15} aria-hidden />
            <span class="header-dropdown-item-label">Export Diagram SVG…</span>
          </button>
          <button
            type="button"
            class="header-dropdown-item"
            role="menuitem"
            disabled={busy()}
            onClick={() => run(exportDiagramPng)}
          >
            <Image size={15} aria-hidden />
            <span class="header-dropdown-item-label">Export Diagram PNG…</span>
          </button>
          <button
            type="button"
            class="header-dropdown-item"
            role="menuitem"
            disabled={busy()}
            onClick={() => run(exportDiagramPdf)}
          >
            <Download size={15} aria-hidden />
            <span class="header-dropdown-item-label">Export Diagram PDF…</span>
          </button>
        </div>
      </Show>
    </div>
  );
}
