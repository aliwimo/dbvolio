import { useEditorStore } from "../../stores/editor-store";

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
          onClick={() => setActivePath(tab.relativePath)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setActivePath(tab.relativePath);
            }
          }}
          role="tab"
          tabIndex={0}
        >
          <span>{tab.relativePath.split("/").pop()}</span>
          <button
            type="button"
            aria-label="Close tab"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.relativePath);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
