import type { CommandDefinition, CommandId } from "./types";

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: "project.open",
    title: "Open Project Folder",
    category: "Project",
  },
  {
    id: "project.openFile",
    title: "Open DBML File",
    category: "Project",
  },
  {
    id: "project.close",
    title: "Close Project",
    category: "Project",
  },
  {
    id: "file.save",
    title: "Save",
    category: "File",
  },
  {
    id: "file.closeEditor",
    title: "Close Editor",
    category: "File",
  },
  {
    id: "settings.open",
    title: "Open Settings",
    category: "Preferences",
  },
  {
    id: "workbench.toggleExplorer",
    title: "Toggle Primary Side Bar Visibility",
    category: "View",
  },
  {
    id: "workbench.showExplorer",
    title: "Show Explorer",
    category: "View",
  },
  {
    id: "panel.toggleEditor",
    title: "Toggle Editor Panel",
    category: "View",
  },
  {
    id: "panel.toggleDiagram",
    title: "Toggle Diagram Panel",
    category: "View",
  },
  {
    id: "panel.toggleInspector",
    title: "Toggle Properties Panel",
    category: "View",
  },
  {
    id: "theme.toggle",
    title: "Toggle Color Theme",
    category: "Preferences",
  },
];

export const COMMAND_BY_ID: Record<CommandId, CommandDefinition> =
  Object.fromEntries(
    COMMAND_DEFINITIONS.map((def) => [def.id, def]),
  ) as Record<CommandId, CommandDefinition>;
