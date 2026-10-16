export type CommandId =
  | "project.open"
  | "project.openFile"
  | "project.openRecent"
  | "project.close"
  | "file.save"
  | "file.closeEditor"
  | "workbench.quickOpen"
  | "settings.open"
  | "workbench.toggleExplorer"
  | "workbench.showExplorer"
  | "panel.toggleEditor"
  | "panel.toggleDiagram"
  | "panel.toggleInspector"
  | "theme.toggle";

export interface Keybinding {
  /** Platform primary modifier (⌘ on macOS, Ctrl elsewhere). */
  mod: boolean;
  /** Explicit Control key (⌃), including on macOS. */
  control: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

export interface CommandDefinition {
  id: CommandId;
  title: string;
  category: string;
}

/** Serialized chord, e.g. `mod+shift+e` or `mod+,` */
export type KeybindingString = string;

export type KeybindingOverrides = Partial<Record<CommandId, KeybindingString | null>>;
