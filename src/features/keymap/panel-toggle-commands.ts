import type { PanelId } from "../../stores/ui-store";
import { formatCommandKeybinding } from "./format-command-keybinding";
import type { CommandId, KeybindingOverrides } from "./types";

export const PANEL_TOGGLE_COMMANDS: Record<PanelId, CommandId> = {
  explorer: "workbench.toggleExplorer",
  editor: "panel.toggleEditor",
  diagram: "panel.toggleDiagram",
  inspector: "panel.toggleInspector",
};

export function panelToggleTitle(
  label: string,
  panelId: PanelId,
  overrides: KeybindingOverrides = {},
): string {
  const shortcut = formatCommandKeybinding(
    PANEL_TOGGLE_COMMANDS[panelId],
    overrides,
  );
  return shortcut ? `${label} (${shortcut})` : label;
}
