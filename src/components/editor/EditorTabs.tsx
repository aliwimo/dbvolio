import { X } from "lucide-react";
import { useMemo } from "react";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";

function basename(relativePath: string): string {
  const parts = relativePath.split("/");
  return parts[parts.length - 1] ?? relativePath;
}

/** When several tabs share a filename, include parent folder(s) in the label. */
export function formatEditorTabLabel(
  relativePath: string,
  openPaths: string[],
): string {
  const base = basename(relativePath);
  const sameName = openPaths.filter((p) => basename(p) === base);
  if (sameName.length <= 1) {
    return base;
  }
  const segments = relativePath.split("/");
  if (segments.length >= 2) {
    return `${segments[segments.length - 2]}/${base}`;
  }
  return relativePath;
}

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs);
  const activePath = useEditorStore((s) => s.activePath);
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const closeTab = useEditorStore((s) => s.closeTab);

  const openPaths = useMemo(
    () => tabs.map((tab) => tab.relativePath),
    [tabs],
  );

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="editor-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.relativePath}
          className={`editor-tab ${activePath === tab.relativePath ? "active" : ""} ${tab.isDirty ? "dirty" : ""}`}
          onClick={() => {
            setActivePath(tab.relativePath);
            if (tab.relativePath.endsWith(".dbml")) {
              useProjectStore.getState().setEntryPoint(tab.relativePath);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setActivePath(tab.relativePath);
              if (tab.relativePath.endsWith(".dbml")) {
                useProjectStore.getState().setEntryPoint(tab.relativePath);
              }
            }
          }}
          role="tab"
          tabIndex={0}
          title={tab.relativePath}
        >
          <span>{formatEditorTabLabel(tab.relativePath, openPaths)}</span>
          <button
            type="button"
            className="editor-tab-close"
            aria-label="Close tab"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.relativePath);
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
