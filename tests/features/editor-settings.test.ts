import { describe, expect, it } from "vitest";
import {
  buildMonacoEditorOptions,
  editorSettingsDefaults,
  mergeEditorSettings,
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
        minimap: true,
        fontFamily: "fira",
      }),
    ).toEqual({
      ...editorSettingsDefaults,
      fontSize: 16,
      minimap: true,
      fontFamily: "fira",
    });
  });

  it("maps font family presets for Monaco", () => {
    const options = buildMonacoEditorOptions({
      ...editorSettingsDefaults,
      fontFamily: "fira",
    });
    expect(options.fontFamily).toContain("Fira Code");
  });

  it("omits fontFamily when using system default", () => {
    const options = buildMonacoEditorOptions(editorSettingsDefaults);
    expect(options.fontFamily).toBeUndefined();
  });
});
