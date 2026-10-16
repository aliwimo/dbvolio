import { X } from "lucide-react";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";

export function EditorTabs() {
  const tabs = useEditorStore((s) => s.tabs);
  const activePath = useEditorStore((s) => s.activePath);
  const setActivePath = useEditorStore((s) => s.setActivePath);
  const closeTab = useEditorStore((s) => s.closeTab);

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
        >
          <span>{tab.relativePath.split("/").pop()}</span>
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
