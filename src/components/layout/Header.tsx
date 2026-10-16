import { Database, Moon, Save, Settings, Sun } from "lucide-react";
import { ExportMenu } from "./ExportMenu";
import { OpenProjectMenu } from "./OpenProjectMenu";
import { useEditorStore } from "../../stores/editor-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import { useCommandKeybindingLabel } from "../../features/keymap/format-command-keybinding";
import { DiagramRootSelect } from "./DiagramRootSelect";
import { PanelToggles } from "./PanelToggles";

export function Header() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const openSettings = useUiStore((s) => s.openSettings);
  const projectName = useProjectStore((s) => s.projectName);
  const saveActive = useEditorStore((s) => s.saveActive);
  const activePath = useEditorStore((s) => s.activePath);
  const activeTab = useEditorStore((s) =>
    s.tabs.find((t) => t.relativePath === s.activePath),
  );
  const saveShortcut = useCommandKeybindingLabel("file.save");
  const settingsShortcut = useCommandKeybindingLabel("settings.open");

  return (
    <header className="header header-compact">
      <div className="header-brand">
        <span className="header-mark" aria-hidden>
          <Database size={13} strokeWidth={2.25} />
        </span>
        <span className="header-title">dbvolio</span>
        {projectName && (
          <>
            <span className="header-brand-sep" aria-hidden />
            <span className="header-project" title={projectName}>
              {projectName}
            </span>
            <DiagramRootSelect />
          </>
        )}
      </div>

      <PanelToggles />

      <div className="header-actions">
        <div className="header-action-group">
          <OpenProjectMenu />
          {projectName && <ExportMenu />}
        </div>
        {projectName && (
          <button
            type="button"
            className={`btn btn-sm header-save ${activeTab?.isDirty ? "btn-primary" : "btn-ghost"}`}
            disabled={!activePath}
            aria-label="Save"
            onClick={() => void saveActive()}
            title={saveShortcut ? `Save (${saveShortcut})` : "Save"}
          >
            <Save size={14} />
            <span className="header-btn-label">Save</span>
          </button>
        )}
        <span className="header-actions-sep" aria-hidden />
        <div className="header-utility">
          <button
            type="button"
            className="btn-icon"
            onClick={openSettings}
            title={
              settingsShortcut ? `Settings (${settingsShortcut})` : "Settings"
            }
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === "dark" ? "Use light theme" : "Use dark theme"}
            aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
}
