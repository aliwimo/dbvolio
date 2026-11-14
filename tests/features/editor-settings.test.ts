import { describe, expect, it } from "vitest";
import {
  editorSettingsDefaults,
  mergeEditorSettings,
  resolveEditorFontFamily,
  sanitizeEditorSettings,
} from "../../src/features/editor/editor-settings";

describe("editor-settings", () => {
  it("clamps numeric bounds and ignores invalid enums", () => {
    expect(
      sanitizeEditorSettings({
        fontSize: 99,
        tabSize: 1,
        lineHeight: -5,
        wordWrap: "invalid" as "on",
        lineNumbers: "maybe" as "on",
      }),
    ).toEqual({
      fontSize: 24,
      tabSize: 2,
      lineHeight: 0,
    });
  });

  it("merges stored partials with defaults", () => {
    expect(
      mergeEditorSettings(editorSettingsDefaults, {
        fontSize: 16,
        folding: false,
        fontFamily: "fira",
      }),
    ).toEqual({
      ...editorSettingsDefaults,
      fontSize: 16,
      folding: false,
      fontFamily: "fira",
    });
  });

  it("resolves font family presets", () => {
    expect(resolveEditorFontFamily("fira")).toContain("Fira Code");
    expect(resolveEditorFontFamily("system")).toBeUndefined();
  });
});
