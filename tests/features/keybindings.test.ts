import { describe, expect, it } from "vitest";
import {
  formatKeybinding,
  isMacPlatform,
  keybindingToString,
  keyboardEventMatchesKeybinding,
  parseKeybindingString,
} from "../../src/features/keymap/default-keybindings";
import {
  findCommandForKeyboardEvent,
  getEffectiveKeybindingString,
} from "../../src/features/keymap/resolve-keybindings";

describe("keybinding parse and format", () => {
  it("parses mod+shift+e", () => {
    expect(parseKeybindingString("mod+shift+e")).toEqual({
      mod: true,
      control: false,
      shift: true,
      alt: false,
      key: "e",
    });
  });

  it("parses mod+comma", () => {
    expect(parseKeybindingString("mod+,")).toEqual({
      mod: true,
      control: false,
      shift: false,
      alt: false,
      key: ",",
    });
  });

  it("parses ctrl+r as control modifier", () => {
    expect(parseKeybindingString("ctrl+r")).toEqual({
      mod: false,
      control: true,
      shift: false,
      alt: false,
      key: "r",
    });
    expect(keybindingToString(parseKeybindingString("ctrl+r")!)).toBe("ctrl+r");
  });

  it("round-trips through keybindingToString", () => {
    const binding = parseKeybindingString("mod+s");
    expect(binding).not.toBeNull();
    expect(keybindingToString(binding!)).toBe("mod+s");
  });

  it("formats bindings for display", () => {
    const binding = parseKeybindingString("mod+shift+e")!;
    expect(formatKeybinding(binding)).toMatch(/E/);
  });
});

describe("resolve keybindings", () => {
  it("uses defaults when no override", () => {
    expect(getEffectiveKeybindingString("file.save", {})).toBe("mod+s");
  });

  it("respects explicit unbind", () => {
    expect(
      getEffectiveKeybindingString("file.save", { "file.save": null }),
    ).toBeNull();
  });

  it("finds command from keyboard event", () => {
    const mac = isMacPlatform();
    const event = {
      key: "s",
      metaKey: mac,
      ctrlKey: !mac,
      shiftKey: false,
      altKey: false,
    } as KeyboardEvent;

    expect(findCommandForKeyboardEvent(event, {})).toBe("file.save");
    expect(
      keyboardEventMatchesKeybinding(
        event,
        parseKeybindingString("mod+s")!,
      ),
    ).toBe(true);
  });
});
