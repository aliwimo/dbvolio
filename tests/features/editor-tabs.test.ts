import { describe, expect, it } from "vitest";
import { formatEditorTabLabel } from "../../src/components/editor/EditorTabs";

describe("formatEditorTabLabel", () => {
  it("shows basename when names are unique", () => {
    expect(formatEditorTabLabel("models/users.dbml", ["models/users.dbml"])).toBe(
      "users.dbml",
    );
  });

  it("adds parent folder when basenames collide", () => {
    const open = ["a/test.dbml", "b/test.dbml"];
    expect(formatEditorTabLabel("a/test.dbml", open)).toBe("a/test.dbml");
    expect(formatEditorTabLabel("b/test.dbml", open)).toBe("b/test.dbml");
  });
});
