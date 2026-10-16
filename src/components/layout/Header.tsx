import { FileText, FolderOpen, Save, Settings, X } from "lucide-react";
import { ExportMenu } from "./ExportMenu";
import { OpenProjectMenu } from "./OpenProjectMenu";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import { useCommandKeybindingLabel } from "../../features/keymap/format-command-keybinding";
import { PanelToggles } from "./PanelToggles";

export function Header() {
  const openSettings = useUiStore((s) => s.openSettings);
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const projectName = useProjectStore((s) => s.projectName);
  const projectScope = useProjectStore((s) => s.projectScope);
  const closeProject = useProjectStore((s) => s.closeProject);
  const closeShortcut = useCommandKeybindingLabel("project.close");
  const saveActive = useEditorStore((s) => s.saveActive);
  const activePath = useEditorStore((s) => s.activePath);
  const activeTab = useEditorStore((s) =>
    s.tabs.find((t) => t.relativePath === s.activePath),
  );
  const saveShortcut = useCommandKeybindingLabel("file.save");
  const settingsShortcut = useCommandKeybindingLabel("settings.open");

  const isDirty = Boolean(activeTab?.isDirty);
  const closeLabel =
    projectScope === "file" ? "Close file" : "Close folder";
  const closeTitle = closeShortcut
    ? `${closeLabel} (${closeShortcut})`
    : closeLabel;
  const ProjectIcon = projectScope === "file" ? FileText : FolderOpen;

  return (
    <header className="header header-toolbar">
      <div className="header-toolbar-start">
        {projectName ? (
          <div className="header-project-wrap">
            <ProjectIcon
              size={14}
              className="header-project-icon"
              aria-hidden
            />
            <span className="header-project" title={projectName}>
              {projectName}
            </span>
            <button
              type="button"
              className="btn-icon header-project-close"
              aria-label={closeLabel}
              title={closeTitle}
              onClick={() =>
                void closeProject().catch((err: unknown) => {
                  const message =
                    err instanceof Error ? err.message : String(err);
                  window.alert(message);
                })
              }
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="header-app-id" aria-hidden>
            <span className="header-mark">DB</span>
            <span className="header-title header-app-name">dbvolio</span>
          </div>
        )}
      </div>

      <div className="header-toolbar-end">
        <div
          className="toolbar-segment header-toolbar-actions"
          role="toolbar"
          aria-label="Toolbar"
        >
          {projectRoot && (
            <>
              <PanelToggles />
              <span className="toolbar-segment-split" aria-hidden />
            </>
          )}

          <div
            className="header-toolbar-file-cluster"
            role="group"
            aria-label="File actions"
          >
            <OpenProjectMenu />
            {projectName && (
              <>
                <ExportMenu />
                <button
                  type="button"
                  className={`btn btn-sm header-toolbar-action header-toolbar-action-icon header-save ${isDirty ? "header-save-dirty btn-primary" : "btn-ghost"}`}
                  disabled={!activePath}
                  aria-label={isDirty ? "Save (unsaved changes)" : "Save"}
                  data-dirty={isDirty || undefined}
                  onClick={() => void saveActive()}
                  title={saveShortcut ? `Save (${saveShortcut})` : "Save"}
                >
                  <Save size={15} />
                </button>
              </>
            )}
          </div>

          <span className="toolbar-segment-split" aria-hidden />

          <button
            type="button"
            className="btn-icon header-toolbar-action header-toolbar-action-icon"
            onClick={openSettings}
            title={
              settingsShortcut ? `Settings (${settingsShortcut})` : "Settings"
            }
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
