import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "../../src/stores/editor-store";

vi.mock("../../src/services/tauri-bridge", () => ({
  readProjectFile: vi.fn(async (relativePath: string) => ({
    content: `content:${relativePath}`,
    modifiedMs: 1,
  })),
  writeProjectFile: vi.fn(),
  createProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
  renameProjectFile: vi.fn(),
}));

describe("useEditorStore.openFile", () => {
  beforeEach(() => {
    useEditorStore.getState().resetSession();
  });

  afterEach(() => {
    useEditorStore.getState().resetSession();
  });

  it("opens a path only once when called concurrently", async () => {
    const store = useEditorStore.getState();
    await Promise.all([
      store.openFile("test.dbml"),
      store.openFile("test.dbml"),
    ]);
    const { tabs, activePath } = useEditorStore.getState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.relativePath).toBe("test.dbml");
    expect(activePath).toBe("test.dbml");
  });
});
