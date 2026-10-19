import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  EDITOR_FONT_FAMILY_OPTIONS,
  type EditorCursorBlinking,
  type EditorFontFamily,
  type EditorLineNumbers,
  type EditorRenderLineHighlight,
  type EditorRenderWhitespace,
  type EditorWordWrap,
} from "../../features/editor/editor-settings";
import { useAppSettingsStore } from "../../stores/app-settings-store";
import { LAYOUT_PRESET_COPY } from "../../features/diagram-layout/layout-preset-copy";
import {
  useDiagramViewStore,
  type DiagramViewOptions,
  type LayoutAlgorithm,
  type LayoutDirection,
  type LayoutSpacing,
} from "../../stores/diagram-view-store";
import { useProjectStore } from "../../stores/project-store";
import { RecentProjectsList } from "../projects/RecentProjectsList";
import { useUiStore, type PanelId, type Theme } from "../../stores/ui-store";
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
  hint?: string;
}[] = [
  { key: "showGrid", label: "Show grid" },
  { key: "showMinimap", label: "Show minimap" },
  { key: "showEdgeLabels", label: "Relation labels on edges" },
  { key: "animateRelationships", label: "Animate relationship flow" },
  {
    key: "emphasizeRelated",
    label: "Dim unrelated tables on selection",
  },
  {
    key: "hideUnmatchedSearch",
    label: "Hide tables that do not match search",
  },
  { key: "snapToGrid", label: "Snap nodes to grid" },
  { key: "showControls", label: "Show canvas zoom controls" },
];

export function AppSettings() {
  const open = useUiStore((s) => s.settingsOpen);
  const closeSettings = useUiStore((s) => s.closeSettings);
  const [section, setSection] = useState<SettingsSection>("recent");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSettings();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeSettings]);

  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay">
      <div
        ref={dialogRef}
        className={`settings-dialog ${section === "keyboard" ? "settings-dialog-wide" : ""}`}
        role="dialog"
        aria-labelledby="settings-title"
      >
        <header className="settings-header">
          <h2 id="settings-title" className="settings-title">
            Settings
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={closeSettings}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </header>

        <div className="settings-body">
          <nav className="settings-nav" aria-label="Settings sections">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`settings-nav-item ${section === id ? "active" : ""}`}
                onClick={() => setSection(id)}
                aria-current={section === id ? "page" : undefined}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {section === "recent" && <RecentSection />}
            {section === "appearance" && <AppearanceSection />}
            {section === "workspace" && <WorkspaceSection />}
            {section === "editor" && <EditorSection />}
            {section === "diagram" && <DiagramSection />}
            {section === "keyboard" && <KeyboardShortcutsSection />}
            {section === "about" && <AboutSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentSection() {
  const projectRoot = useProjectStore((s) => s.projectRoot);
  const projectName = useProjectStore((s) => s.projectName);

  return (
    <>
      <SettingsSectionBlock title="Recent projects">
        <p className="settings-section-desc">
          Quickly reopen folders you have opened before. Up to 8 paths are
          remembered on this device.
        </p>
        <RecentProjectsList variant="settings" />
      </SettingsSectionBlock>
      {projectRoot && (
        <SettingsSectionBlock title="Current project">
          <dl className="settings-about-list">
            <div>
              <dt>Name</dt>
              <dd>{projectName ?? "Project"}</dd>
            </div>
            <div>
              <dt>Path</dt>
              <dd className="settings-path-value">{projectRoot}</dd>
            </div>
          </dl>
        </SettingsSectionBlock>
      )}
    </>
  );
}

function AppearanceSection() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  return (
    <SettingsSectionBlock title="Theme">
      <SettingsField label="Color theme" hint="Applies to the workspace and Monaco editor.">
        <select
          className="select-compact settings-select-wide"
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </SettingsField>
    </SettingsSectionBlock>
  );
}

function WorkspaceSection() {
  const panels = useUiStore((s) => s.panels);
  const setPanel = useUiStore((s) => s.setPanel);
  const showAllFiles = useUiStore((s) => s.explorerShowAllFiles);
  const setShowAllFiles = useUiStore((s) => s.setExplorerShowAllFiles);

  return (
    <>
      <SettingsSectionBlock title="Panels">
        <p className="settings-section-desc">
          Choose which panels are visible in the workspace. You can also toggle
          them from the header or with keyboard shortcuts (see tooltips on each
          toggle).
        </p>
        {(Object.keys(PANEL_LABELS) as PanelId[]).map((id) => (
          <SettingsToggle
            key={id}
            label={PANEL_LABELS[id]}
            checked={panels[id]}
            onChange={(checked) => setPanel(id, checked)}
          />
        ))}
      </SettingsSectionBlock>

      <SettingsSectionBlock title="Explorer">
        <SettingsToggle
          label="Show all project files"
          hint="When off, the tree lists only .dbml files and their folders."
          checked={showAllFiles}
          onChange={setShowAllFiles}
        />
      </SettingsSectionBlock>
    </>
  );
}

function EditorSection() {
  const editor = useAppSettingsStore(
    useShallow((s) => ({
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      lineHeight: s.lineHeight,
      wordWrap: s.wordWrap,
      minimap: s.minimap,
      lineNumbers: s.lineNumbers,
      tabSize: s.tabSize,
      insertSpaces: s.insertSpaces,
      renderWhitespace: s.renderWhitespace,
      folding: s.folding,
      renderLineHighlight: s.renderLineHighlight,
      cursorBlinking: s.cursorBlinking,
      bracketPairColorization: s.bracketPairColorization,
    })),
  );
  const parseDebounceMs = useAppSettingsStore((s) => s.parseDebounceMs);
  const patchEditorSettings = useAppSettingsStore((s) => s.patchEditorSettings);
  const setParseDebounceMs = useAppSettingsStore((s) => s.setParseDebounceMs);
  const resetEditorSettings = useAppSettingsStore((s) => s.resetEditorSettings);

  return (
    <>
      <SettingsSectionBlock title="Typography">
        <SettingsField label="Font size">
          <input
            type="number"
            className="settings-input-number"
            min={10}
            max={24}
            value={editor.fontSize}
            onChange={(e) =>
              patchEditorSettings({ fontSize: Number(e.target.value) })
            }
          />
        </SettingsField>
        <SettingsField
          label="Font family"
          hint="Install custom fonts on your system for non-default choices."
        >
          <select
            className="select-compact settings-select-wide"
            value={editor.fontFamily}
            onChange={(e) =>
              patchEditorSettings({
                fontFamily: e.target.value as EditorFontFamily,
              })
            }
          >
            {EDITOR_FONT_FAMILY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </SettingsField>
        <SettingsField
          label="Line height"
          hint="0 uses Monaco's automatic line height."
        >
          <input
            type="number"
            className="settings-input-number"
            min={0}
            max={40}
            value={editor.lineHeight}
            onChange={(e) =>
              patchEditorSettings({ lineHeight: Number(e.target.value) })
            }
          />
        </SettingsField>
      </SettingsSectionBlock>

      <SettingsSectionBlock title="Layout & display">
        <SettingsField label="Word wrap">
          <select
            className="select-compact settings-select-wide"
            value={editor.wordWrap}
            onChange={(e) =>
              patchEditorSettings({
                wordWrap: e.target.value as EditorWordWrap,
              })
            }
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="bounded">Bounded to viewport</option>
          </select>
        </SettingsField>
        <SettingsField label="Line numbers">
          <select
            className="select-compact settings-select-wide"
            value={editor.lineNumbers}
            onChange={(e) =>
              patchEditorSettings({
                lineNumbers: e.target.value as EditorLineNumbers,
              })
            }
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="relative">Relative</option>
          </select>
        </SettingsField>
        <SettingsField label="Render whitespace">
          <select
            className="select-compact settings-select-wide"
            value={editor.renderWhitespace}
            onChange={(e) =>
              patchEditorSettings({
                renderWhitespace: e.target.value as EditorRenderWhitespace,
              })
            }
          >
            <option value="none">None</option>
            <option value="boundary">Boundary</option>
            <option value="selection">Selection</option>
            <option value="trailing">Trailing</option>
            <option value="all">All</option>
          </select>
        </SettingsField>
        <SettingsField label="Current line highlight">
          <select
            className="select-compact settings-select-wide"
            value={editor.renderLineHighlight}
            onChange={(e) =>
              patchEditorSettings({
                renderLineHighlight: e.target.value as EditorRenderLineHighlight,
              })
            }
          >
            <option value="line">Line</option>
            <option value="all">All</option>
            <option value="gutter">Gutter</option>
            <option value="none">None</option>
          </select>
        </SettingsField>
        <SettingsField label="Cursor animation">
          <select
            className="select-compact settings-select-wide"
            value={editor.cursorBlinking}
            onChange={(e) =>
              patchEditorSettings({
                cursorBlinking: e.target.value as EditorCursorBlinking,
              })
            }
          >
            <option value="blink">Blink</option>
            <option value="smooth">Smooth</option>
            <option value="phase">Phase</option>
            <option value="expand">Expand</option>
            <option value="solid">Solid</option>
          </select>
        </SettingsField>
        <SettingsToggle
          label="Minimap"
          checked={editor.minimap}
          onChange={(minimap) => patchEditorSettings({ minimap })}
        />
        <SettingsToggle
          label="Code folding"
          checked={editor.folding}
          onChange={(folding) => patchEditorSettings({ folding })}
        />
        <SettingsToggle
          label="Bracket pair colorization"
          checked={editor.bracketPairColorization}
          onChange={(bracketPairColorization) =>
            patchEditorSettings({ bracketPairColorization })
          }
        />
        <div className="settings-actions-row">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={resetEditorSettings}
          >
            Reset editor defaults
          </button>
        </div>
      </SettingsSectionBlock>

      <SettingsSectionBlock title="Indentation">
        <SettingsField label="Tab size">
          <input
            type="number"
            className="settings-input-number"
            min={2}
            max={8}
            value={editor.tabSize}
            onChange={(e) =>
              patchEditorSettings({ tabSize: Number(e.target.value) })
            }
          />
        </SettingsField>
        <SettingsToggle
          label="Insert spaces instead of tabs"
          checked={editor.insertSpaces}
          onChange={(insertSpaces) => patchEditorSettings({ insertSpaces })}
        />
      </SettingsSectionBlock>

      <SettingsSectionBlock title="Schema parsing">
        <SettingsField
          label="Parse delay (ms)"
          hint="Wait time after edits before re-parsing the entry DBML file."
        >
          <input
            type="number"
            className="settings-input-number"
            min={100}
            max={2000}
            step={50}
            value={parseDebounceMs}
            onChange={(e) => setParseDebounceMs(Number(e.target.value))}
          />
        </SettingsField>
      </SettingsSectionBlock>
    </>
  );
}

function DiagramSection() {
  const layoutAlgorithm = useDiagramViewStore((s) => s.layoutAlgorithm);
  const layoutDirection = useDiagramViewStore((s) => s.layoutDirection);
  const layoutSpacing = useDiagramViewStore((s) => s.layoutSpacing);
  const layoutFitView = useDiagramViewStore((s) => s.layoutFitView);
  const layoutSeparateComponents = useDiagramViewStore(
    (s) => s.layoutSeparateComponents,
  );
  const setOption = useDiagramViewStore((s) => s.setOption);
  const toggleOption = useDiagramViewStore((s) => s.toggleOption);

  return (
    <SettingsSectionBlock title="Diagram defaults">
      <SettingsField label="Auto-arrange preset">
        <select
          className="select-compact settings-select-wide"
          value={layoutAlgorithm}
          onChange={(e) =>
            setOption("layoutAlgorithm", e.target.value as typeof layoutAlgorithm)
          }
        >
          {(Object.keys(LAYOUT_PRESET_COPY) as LayoutAlgorithm[]).map((key) => (
            <option key={key} value={key}>
              {LAYOUT_PRESET_COPY[key].label}
            </option>
          ))}
        </select>
      </SettingsField>
      <SettingsField label="Relationship flow direction">
        <select
          className="select-compact settings-select-wide"
          value={layoutDirection}
          onChange={(e) =>
            setOption("layoutDirection", e.target.value as LayoutDirection)
          }
        >
          <option value="LR">Left to right</option>
          <option value="TB">Top to bottom</option>
          <option value="RL">Right to left</option>
          <option value="BT">Bottom to top</option>
        </select>
      </SettingsField>
      <SettingsField label="Auto-layout spacing">
        <select
          className="select-compact settings-select-wide"
          value={layoutSpacing}
          onChange={(e) =>
            setOption("layoutSpacing", e.target.value as LayoutSpacing)
          }
        >
          <option value="compact">Compact</option>
          <option value="default">Default</option>
          <option value="relaxed">Relaxed</option>
        </select>
      </SettingsField>
      <SettingsToggle
        label="Fit view after auto layout"
        checked={layoutFitView}
        onChange={() => toggleOption("layoutFitView")}
      />
      <SettingsToggle
        label="Layout disconnected groups separately"
        checked={layoutSeparateComponents}
        onChange={() => toggleOption("layoutSeparateComponents")}
      />
      {DIAGRAM_TOGGLES.map(({ key, label, hint }) => (
        <DiagramOptionToggle key={key} optionKey={key} label={label} hint={hint} />
      ))}
    </SettingsSectionBlock>
  );
}

function DiagramOptionToggle({
  optionKey,
  label,
  hint,
}: {
  optionKey: keyof DiagramViewOptions;
  label: string;
  hint?: string;
}) {
  const checked = useDiagramViewStore((s) => s[optionKey] as boolean);
  const toggleOption = useDiagramViewStore((s) => s.toggleOption);

  return (
    <SettingsToggle
      label={label}
      hint={hint}
      checked={checked}
      onChange={() => toggleOption(optionKey)}
    />
  );
}

const ABOUT_LINKS = [
  {
    label: "DBML",
    url: "https://dbml.dbdiagram.io/home/",
    hint: "Specification and language reference",
  },
  {
    label: "GitHub",
    url: "https://github.com/aliwimo/dbvolio",
    hint: "Source code and issues",
  },
] as const;

async function openExternalLink(url: string) {
  try {
    await openUrl(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function AboutSection() {
  return (
    <div className="settings-about">
      <header className="settings-about-hero">
        <img
          className="settings-about-icon"
          src="/dbvolio-icon.png"
          alt=""
          width={52}
          height={52}
        />
        <div className="settings-about-hero-copy">
          <p className="settings-about-name">DB-Volio</p>
          <p className="settings-about-tagline">
            Edit DBML, explore relationships on a live diagram, and export when
            you are ready—without sending your schema to the cloud.
          </p>
          <p className="settings-about-version">Version {__DBVOLIO_VERSION__}</p>
        </div>
      </header>

      <ul className="settings-about-highlights">
        <li>Multi-file projects with import resolution and inline diagnostics</li>
        <li>Monaco editor, React Flow diagram, and a schema properties panel</li>
        <li>Filesystem access stays on your machine (Tauri + path-scoped I/O)</li>
      </ul>

      <SettingsSectionBlock title="Your data">
        <p className="settings-section-desc">
          <code>.dbml</code> files in your project are the source of truth.
          Diagram positions and layout presets are stored separately in{" "}
          <code>.dbvolio/layout.json</code> so you can version schema and layout
          independently.
        </p>
      </SettingsSectionBlock>

      <SettingsSectionBlock title="Links">
        <div className="settings-about-links">
          {ABOUT_LINKS.map(({ label, url, hint }) => (
            <button
              key={url}
              type="button"
              className="settings-about-link btn btn-ghost btn-sm"
              onClick={() => void openExternalLink(url)}
              title={hint}
            >
              <span>{label}</span>
              <ExternalLink size={14} aria-hidden />
            </button>
          ))}
        </div>
      </SettingsSectionBlock>
    </div>
  );
}

function SettingsSectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-block">
      <h3 className="settings-block-title">{title}</h3>
      <div className="settings-block-body">{children}</div>
    </section>
  );
}

function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-field">
      <div className="settings-field-label">
        <span>{label}</span>
        {hint && <span className="settings-field-hint">{hint}</span>}
      </div>
      <div className="settings-field-control">{children}</div>
    </div>
  );
}

function SettingsToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="settings-toggle-text">
        <span>{label}</span>
        {hint && <span className="settings-field-hint">{hint}</span>}
      </span>
    </label>
  );
}
