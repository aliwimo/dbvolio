import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, X } from "lucide-solid";
import { createSignal, onCleanup, onMount, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useAppSettingsStore } from "../../stores/app-settings-store";
import {
  useDiagramViewStore,
  type DiagramViewOptions,
} from "../../stores/diagram-view-store";
import { RecentProjectsList } from "../projects/RecentProjectsList";
import { useUiStore, type PanelId } from "../../stores/ui-store";
import { KeyboardShortcutsSection } from "./KeyboardShortcutsSection";

type SettingsSection =
  | "recent"
  | "appearance"
  | "workspace"
  | "editor"
  | "diagram"
  | "keyboard"
  | "about";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "appearance", label: "Appearance" },
  { id: "workspace", label: "Workspace" },
  { id: "editor", label: "Editor" },
  { id: "diagram", label: "Diagram" },
  { id: "keyboard", label: "Keyboard" },
  { id: "about", label: "About" },
];

const PANEL_LABELS: Record<PanelId, string> = {
  explorer: "File explorer",
  editor: "Editor",
  diagram: "Diagram",
  inspector: "Properties",
};

const DIAGRAM_TOGGLES: {
  key: keyof DiagramViewOptions;
  label: string;
}[] = [
  { key: "showGrid", label: "Show grid" },
  { key: "showMinimap", label: "Show minimap" },
  { key: "showEdgeLabels", label: "Relation labels on edges" },
  { key: "animateRelationships", label: "Animate relationship flow" },
  { key: "emphasizeRelated", label: "Dim unrelated tables on selection" },
  { key: "hideUnmatchedSearch", label: "Hide tables that do not match search" },
  { key: "snapToGrid", label: "Snap nodes to grid" },
  { key: "showControls", label: "Show canvas zoom controls" },
];

export function AppSettings() {
  const open = () => useUiStore((s) => s.settingsOpen);
  const closeSettings = useUiStore.getState().closeSettings;
  const [section, setSection] = createSignal<SettingsSection>("recent");

  const theme = () => useUiStore((s) => s.theme);
  const setTheme = useUiStore.getState().setTheme;
  const panels = () => useUiStore((s) => s.panels);
  const togglePanel = useUiStore.getState().togglePanel;

  const editor = () => useAppSettingsStore((s) => s);
  const patchEditor = useAppSettingsStore.getState().patchEditorSettings;

  const diagramView = () => useDiagramViewStore((s) => s);
  const toggleDiagramOption = useDiagramViewStore.getState().toggleOption;

  const onKeyDown = (e: KeyboardEvent) => {
    if (open() && e.key === "Escape") {
      closeSettings();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <Show when={open()}>
      <Portal>
        <div
          class="modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeSettings();
          }}
        >
          <div
            class="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            <div class="settings-sidebar">
              <h2 class="settings-title">Settings</h2>
              <nav class="settings-nav" aria-label="Settings sections">
                <For each={SECTIONS}>
                  {({ id, label }) => (
                    <button
                      type="button"
                      class={`settings-nav-item ${section() === id ? "active" : ""}`}
                      onClick={() => setSection(id)}
                    >
                      {label}
                    </button>
                  )}
                </For>
              </nav>
            </div>

            <div class="settings-content">
              <header class="settings-header">
                <h3 class="settings-heading">
                  {SECTIONS.find((s) => s.id === section())?.label}
                </h3>
                <button
                  type="button"
                  class="btn-icon"
                  onClick={closeSettings}
                  aria-label="Close settings"
                >
                  <X size={16} />
                </button>
              </header>

              <div class="settings-body">
                <Show when={section() === "recent"}>
                  <RecentProjectsList variant="settings" />
                </Show>

                <Show when={section() === "appearance"}>
                  <div class="settings-group">
                    <label class="settings-label">Theme</label>
                    <div class="settings-theme-options">
                      <button
                        type="button"
                        class={`btn btn-sm ${theme() === "dark" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setTheme("dark")}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        class={`btn btn-sm ${theme() === "light" ? "btn-primary" : "btn-ghost"}`}
                        onClick={() => setTheme("light")}
                      >
                        Light
                      </button>
                    </div>
                  </div>
                </Show>

                <Show when={section() === "workspace"}>
                  <div class="settings-group">
                    <label class="settings-label">Panels visibility</label>
                    <For each={(["explorer", "editor", "diagram", "inspector"] as PanelId[])}>
                      {(pId) => (
                        <label class="settings-checkbox-row">
                          <input
                            type="checkbox"
                            checked={panels()[pId]}
                            onChange={() => togglePanel(pId)}
                          />
                          <span>{PANEL_LABELS[pId]}</span>
                        </label>
                      )}
                    </For>
                  </div>
                </Show>

                <Show when={section() === "editor"}>
                  <div class="settings-group">
                    <label class="settings-label">Font Size</label>
                    <input
                      type="number"
                      class="settings-input"
                      value={editor().fontSize}
                      min={10}
                      max={32}
                      onChange={(e) =>
                        patchEditor({ fontSize: Number(e.currentTarget.value) })
                      }
                    />
                  </div>
                  <div class="settings-group">
                    <label class="settings-checkbox-row">
                      <input
                        type="checkbox"
                        checked={editor().minimap}
                        onChange={(e) =>
                          patchEditor({ minimap: e.currentTarget.checked })
                        }
                      />
                      <span>Minimap</span>
                    </label>
                  </div>
                  <div class="settings-group">
                    <label class="settings-checkbox-row">
                      <input
                        type="checkbox"
                        checked={editor().wordWrap === "on"}
                        onChange={(e) =>
                          patchEditor({
                            wordWrap: e.currentTarget.checked ? "on" : "off",
                          })
                        }
                      />
                      <span>Word wrap</span>
                    </label>
                  </div>
                </Show>

                <Show when={section() === "diagram"}>
                  <div class="settings-group">
                    <label class="settings-label">Diagram Toggles</label>
                    <For each={DIAGRAM_TOGGLES}>
                      {({ key, label }) => (
                        <label class="settings-checkbox-row">
                          <input
                            type="checkbox"
                            checked={Boolean(diagramView()[key])}
                            onChange={() => toggleDiagramOption(key)}
                          />
                          <span>{label}</span>
                        </label>
                      )}
                    </For>
                  </div>
                </Show>

                <Show when={section() === "keyboard"}>
                  <KeyboardShortcutsSection />
                </Show>

                <Show when={section() === "about"}>
                  <div class="settings-about">
                    <p class="settings-about-title">dbvolio</p>
                    <p class="settings-about-version">
                      Desktop DBML Schema Designer
                    </p>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      onClick={() =>
                        void openUrl("https://github.com/aliwimo/dbvolio")
                      }
                    >
                      <ExternalLink size={14} />
                      GitHub Repository
                    </button>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
