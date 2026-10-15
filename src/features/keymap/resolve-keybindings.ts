import {
  DEFAULT_KEYBINDINGS,
  keybindingFromKeyboardEvent,
  keybindingToString,
  keyboardEventMatchesKeybinding,
  parseKeybindingString,
} from "./default-keybindings";
import type { CommandId, Keybinding, KeybindingOverrides } from "./types";

export function getEffectiveKeybindingString(
  commandId: CommandId,
  overrides: KeybindingOverrides,
): string | null {
  if (Object.prototype.hasOwnProperty.call(overrides, commandId)) {
    const override = overrides[commandId];
    if (override === null || override === undefined) {
      return null;
    }
    return override;
  }
  const fallback = DEFAULT_KEYBINDINGS[commandId];
  return fallback !== undefined ? fallback : null;
}

export function getEffectiveKeybinding(
  commandId: CommandId,
  overrides: KeybindingOverrides,
): Keybinding | null {
  const raw = getEffectiveKeybindingString(commandId, overrides);
  if (!raw) {
    return null;
  }
  return parseKeybindingString(raw);
}

export function listBoundCommands(
  overrides: KeybindingOverrides,
): { commandId: CommandId; binding: Keybinding }[] {
  const result: { commandId: CommandId; binding: Keybinding }[] = [];
  for (const commandId of Object.keys(DEFAULT_KEYBINDINGS) as CommandId[]) {
    const binding = getEffectiveKeybinding(commandId, overrides);
    if (binding) {
      result.push({ commandId, binding });
    }
  }
  return result;
}

export function findCommandForKeyboardEvent(
  event: KeyboardEvent,
  overrides: KeybindingOverrides,
): CommandId | null {
  const pressed = keybindingFromKeyboardEvent(event);
  if (!pressed) {
    return null;
  }

  for (const commandId of Object.keys(DEFAULT_KEYBINDINGS) as CommandId[]) {
    const binding = getEffectiveKeybinding(commandId, overrides);
    if (binding && keyboardEventMatchesKeybinding(event, binding)) {
      return commandId;
    }
  }
  return null;
}

export function findConflictingCommand(
  binding: Keybinding,
  overrides: KeybindingOverrides,
  exceptCommandId?: CommandId,
): CommandId | null {
  const chord = keybindingToString(binding);
  for (const commandId of Object.keys(DEFAULT_KEYBINDINGS) as CommandId[]) {
    if (commandId === exceptCommandId) {
      continue;
    }
    const effective = getEffectiveKeybinding(commandId, overrides);
    if (effective && keybindingToString(effective) === chord) {
      return commandId;
    }
  }
  return null;
}
