export type CommandId =
  | "project.open"
  | "project.openFile"
  | "project.close"
  | "file.save"
  | "file.closeEditor"
  | "settings.open"
  | "workbench.toggleExplorer"
  | "workbench.showExplorer"
  | "panel.toggleEditor"
  | "panel.toggleDiagram"
  | "panel.toggleInspector"
  | "theme.toggle";

export interface Keybinding {
  mod: boolean;
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
