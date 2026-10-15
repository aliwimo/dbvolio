import { describe, expect, it } from "vitest";
import {
  formatKeybinding,
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
      shift: true,
      alt: false,
      key: "e",
    });
  });

  it("parses mod+comma", () => {
    expect(parseKeybindingString("mod+,")).toEqual({
      mod: true,
      shift: false,
      alt: false,
      key: ",",
    });
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
    const event = {
      key: "s",
      metaKey: true,
      ctrlKey: false,
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
