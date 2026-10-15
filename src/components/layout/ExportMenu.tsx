import {
  ChevronDown,
  Download,
  FileCode,
  FileImage,
  FileText,
  Image,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  exportDiagramPdf,
  exportDiagramPng,
  exportDiagramSvg,
  exportSql,
} from "../../features/export/export-actions";
import { useProjectStore } from "../../stores/project-store";

export function ExportMenu() {
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const canExport = Boolean(projectRoot && entryPoint);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!canExport) {
      setOpen(false);
    }
  }, [canExport]);

  const run = (action: () => Promise<void>) => {
    setBusy(true);
    void action().finally(() => {
      setBusy(false);
      setOpen(false);
    });
  };

  return (
    <div className="header-dropdown" ref={wrapRef}>
      <div className="header-dropdown-trigger">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!canExport || busy}
          aria-label="Export"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Download size={15} />
          <span className="header-btn-label">Export</span>
          <ChevronDown size={14} className="header-dropdown-caret" />
        </button>
      </div>
      {open && canExport && (
        <div className="header-dropdown-menu" role="menu">
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            disabled={busy}
            onClick={() => run(() => exportSql(true))}
          >
            <FileCode size={15} aria-hidden />
            <span>
              <span className="header-dropdown-item-label">Postgres SQL</span>
              <span className="header-dropdown-item-hint">schema.sql</span>
            </span>
          </button>
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            disabled={busy}
            onClick={() => run(() => exportDiagramSvg())}
          >
            <Image size={15} aria-hidden />
            <span>
              <span className="header-dropdown-item-label">Diagram SVG</span>
              <span className="header-dropdown-item-hint">Vector image</span>
            </span>
          </button>
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            disabled={busy}
            onClick={() => run(() => exportDiagramPng())}
          >
            <FileImage size={15} aria-hidden />
            <span>
              <span className="header-dropdown-item-label">Diagram PNG</span>
              <span className="header-dropdown-item-hint">Raster image</span>
            </span>
          </button>
          <button
            type="button"
            className="header-dropdown-item"
            role="menuitem"
            disabled={busy}
            onClick={() => run(() => exportDiagramPdf())}
          >
            <FileText size={15} aria-hidden />
            <span>
              <span className="header-dropdown-item-label">Diagram PDF</span>
              <span className="header-dropdown-item-hint">Vector document</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
