import type { CommandId, Keybinding, KeybindingString } from "./types";

/** VS Code–style defaults (Mod = ⌘ on macOS, Ctrl elsewhere). */
export const DEFAULT_KEYBINDINGS: Record<CommandId, KeybindingString> = {
  "project.open": "mod+o",
  "file.save": "mod+s",
  "file.closeEditor": "mod+w",
  "settings.open": "mod+,",
  "workbench.toggleExplorer": "mod+b",
  "workbench.showExplorer": "mod+shift+e",
  "panel.toggleEditor": "mod+shift+1",
  "panel.toggleDiagram": "mod+shift+2",
  "panel.toggleInspector": "mod+shift+i",
  "theme.toggle": "mod+shift+t",
};

export function defaultKeybindingFor(commandId: CommandId): Keybinding | null {
  const raw = DEFAULT_KEYBINDINGS[commandId];
  if (!raw) {
    return null;
  }
  return parseKeybindingString(raw);
}

export function parseKeybindingString(raw: KeybindingString): Keybinding | null {
  const parts = raw
    .split("+")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  let mod = false;
  let shift = false;
  let alt = false;
  let key: string | null = null;

  for (const part of parts) {
    if (part === "mod" || part === "cmd" || part === "meta" || part === "ctrl") {
      mod = true;
      continue;
    }
    if (part === "shift") {
      shift = true;
      continue;
    }
    if (part === "alt" || part === "option") {
      alt = true;
      continue;
    }
    key = part.length === 1 ? part : normalizeKeyName(part);
  }

  if (!key) {
    return null;
  }

  return { mod, shift, alt, key };
}

export function keybindingToString(binding: Keybinding): KeybindingString {
  const parts: string[] = [];
  if (binding.mod) {
    parts.push("mod");
  }
  if (binding.shift) {
    parts.push("shift");
  }
  if (binding.alt) {
    parts.push("alt");
  }
  parts.push(binding.key);
  return parts.join("+");
}

function normalizeKeyName(key: string): string {
  const lower = key.toLowerCase();
  if (lower === "escape" || lower === "esc") {
    return "escape";
  }
  if (lower === "comma") {
    return ",";
  }
  if (lower.length === 1) {
    return lower;
  }
  return lower;
}

export function normalizeEventKey(event: KeyboardEvent): string | null {
  const key = event.key;
  if (!key || key === "Unidentified") {
    return null;
  }
  if (key === "Escape") {
    return "escape";
  }
  if (key === " ") {
    return "space";
  }
  if (key.length === 1) {
    return key.toLowerCase();
  }
  return key.toLowerCase();
}

const MODIFIER_KEYS = new Set([
  "shift",
  "control",
  "alt",
  "meta",
  "os",
]);

export function keybindingFromKeyboardEvent(
  event: KeyboardEvent,
): Keybinding | null {
  const key = normalizeEventKey(event);
  if (!key || MODIFIER_KEYS.has(key)) {
    return null;
  }

  return {
    mod: event.metaKey || event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    key,
  };
}

export function keybindingsMatch(
  a: Keybinding,
  b: Keybinding,
): boolean {
  return (
    a.mod === b.mod &&
    a.shift === b.shift &&
    a.alt === b.alt &&
    a.key === b.key
  );
}

export function keyboardEventMatchesKeybinding(
  event: KeyboardEvent,
  binding: Keybinding,
): boolean {
  const fromEvent = keybindingFromKeyboardEvent(event);
  if (!fromEvent) {
    return false;
  }
  return keybindingsMatch(fromEvent, binding);
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent);
}

export function formatKeybinding(binding: Keybinding): string {
  const mac = isMacPlatform();
  const parts: string[] = [];

  if (binding.mod) {
    parts.push(mac ? "⌘" : "Ctrl");
  }
  if (binding.shift) {
    parts.push(mac ? "⇧" : "Shift");
  }
  if (binding.alt) {
    parts.push(mac ? "⌥" : "Alt");
  }

  parts.push(formatKeyLabel(binding.key, mac));
  return mac ? parts.join("") : parts.join("+");
}

function formatKeyLabel(key: string, mac: boolean): string {
  if (key === ",") {
    return mac ? "," : ",";
  }
  if (key === "escape") {
    return "Esc";
  }
  if (key === "space") {
    return "Space";
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}
