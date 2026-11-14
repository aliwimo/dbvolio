import { FileText, FolderOpen, Save, Settings, X } from "lucide-solid";
import { Show } from "solid-js";
import { Button } from "../../shared/ui";
import { ExportMenu } from "./ExportMenu";
import { OpenProjectMenu } from "./OpenProjectMenu";
import { useEditorStore } from "../../features/editor/editor-store";
import { useProjectStore } from "../../features/projects/project-store";
import { useUiStore } from "../../shared/stores/ui-store";
import { useCommandKeybindingLabel } from "../../features/keymap/format-command-keybinding";
import { PanelToggles } from "./PanelToggles";

export function Header() {
  const openSettings = useUiStore.getState().openSettings;
  const projectRoot = () => useProjectStore((s) => s.projectRoot);
  const projectName = () => useProjectStore((s) => s.projectName);
  const projectScope = () => useProjectStore((s) => s.projectScope);
  const closeProject = useProjectStore.getState().closeProject;
  const closeShortcut = () => useCommandKeybindingLabel("project.close");
  const saveActive = useEditorStore.getState().saveActive;
  const activePath = () => useEditorStore((s) => s.activePath);
  const activeTab = () =>
    useEditorStore((s) => s.tabs.find((t) => t.relativePath === s.activePath));
  const saveShortcut = () => useCommandKeybindingLabel("file.save");
  const settingsShortcut = () => useCommandKeybindingLabel("settings.open");

  const isDirty = () => Boolean(activeTab()?.isDirty);
  const closeLabel = () =>
    projectScope() === "file" ? "Close file" : "Close folder";
  const closeTitle = () =>
    closeShortcut() ? `${closeLabel()} (${closeShortcut()})` : closeLabel();

  return (
    <header class="header header-toolbar">
      <div class="header-toolbar-start">
        <Show
          when={projectName()}
          fallback={
            <div class="header-app-id" aria-hidden>
              <span class="header-mark">DB</span>
              <span class="header-title header-app-name">dbvolio</span>
            </div>
          }
        >
          <div class="header-project-wrap">
            <Show
              when={projectScope() === "file"}
              fallback={<FolderOpen size={14} class="header-project-icon" aria-hidden />}
            >
              <FileText size={14} class="header-project-icon" aria-hidden />
            </Show>
            <span class="header-project" title={projectName() ?? ""}>
              {projectName()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              class="header-project-close"
              aria-label={closeLabel()}
              title={closeTitle()}
              onClick={() =>
                void closeProject().catch((err: unknown) => {
                  const message =
                    err instanceof Error ? err.message : String(err);
                  window.alert(message);
                })
              }
            >
              <X size={14} />
            </Button>
          </div>
        </Show>
      </div>

      <div class="header-toolbar-end">
        <div
          class="toolbar-segment header-toolbar-actions"
          role="toolbar"
          aria-label="Toolbar"
        >
          <Show when={projectRoot()}>
            <PanelToggles />
            <span class="toolbar-segment-split" aria-hidden />
          </Show>

          <OpenProjectMenu />

          <Button
            variant="ghost"
            size="icon"
            class="header-save"
            disabled={!activePath() || !isDirty()}
            aria-label="Save file"
            title={
              saveShortcut()
                ? `Save file (${saveShortcut()})`
                : "Save file"
            }
            onClick={() => void saveActive()}
          >
            <Save size={15} />
            <span class="header-btn-label">Save</span>
          </Button>

          <ExportMenu />

          <Button
            variant="ghost"
            size="icon"
            class="header-btn-settings"
            title={
              settingsShortcut()
                ? `Settings (${settingsShortcut()})`
                : "Settings"
            }
            aria-label="Settings"
            onClick={openSettings}
          >
            <Settings size={15} />
          </Button>
        </div>
      </div>
    </header>
  );
}
