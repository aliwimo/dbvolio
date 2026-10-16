import { ChevronDown, FileCode } from "lucide-react";
import { useMemo } from "react";
import { useProjectStore } from "../../stores/project-store";

export function DiagramRootSelect() {
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const files = useProjectStore((s) => s.files);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const setEntryPoint = useProjectStore((s) => s.setEntryPoint);

  const dbmlPaths = useMemo(
    () =>
      files
        .filter(
          (f) => !f.isDirectory && f.relativePath.endsWith(".dbml"),
        )
        .map((f) => f.relativePath)
        .sort((a, b) => a.localeCompare(b)),
    [files],
  );

  if (!projectRoot || dbmlPaths.length === 0) {
    return null;
  }

  const value = entryPoint && dbmlPaths.includes(entryPoint) ? entryPoint : dbmlPaths[0];

  return (
    <label className="header-diagram-root" title="DBML file used to build the diagram">
      <FileCode size={13} strokeWidth={2} aria-hidden />
      <select
        className="select-compact header-entry-select"
        value={value}
        onChange={(e) => setEntryPoint(e.target.value)}
        aria-label="Diagram root DBML file"
      >
        {dbmlPaths.map((path) => (
          <option key={path} value={path} title={path}>
            {path}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="header-diagram-chevron" aria-hidden />
    </label>
  );
}
