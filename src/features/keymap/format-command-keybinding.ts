import { formatKeybinding } from "./default-keybindings";
import { getEffectiveKeybinding } from "./resolve-keybindings";
import type { CommandId } from "./types";
import { useKeymapStore } from "../../stores/keymap-store";

export function formatCommandKeybinding(
  commandId: CommandId,
  overrides = useKeymapStore.getState().overrides,
): string | null {
  const binding = getEffectiveKeybinding(commandId, overrides);
  if (!binding) {
    return null;
  }
  return formatKeybinding(binding);
}

export function useCommandKeybindingLabel(commandId: CommandId): string | null {
  const overrides = useKeymapStore((s) => s.overrides);
  return formatCommandKeybinding(commandId, overrides);
}
