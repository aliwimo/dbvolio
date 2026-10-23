import { beforeEach, describe, expect, it, vi } from "vitest";

const disk: Record<string, string> = {};

vi.mock("../../src/services/tauri-bridge", () => ({
  readProjectFile: async (relativePath: string) => ({
    content: disk[relativePath] ?? "",
    modifiedMs: 0,
  }),
  writeProjectFile: async () => ({ modifiedMs: 0 }),
}));

import { applyAssignTableToGroup } from "../../src/features/schema/apply-schema-edits";
import { useEditorStore } from "../../src/stores/editor-store";
import type { SchemaTable } from "../../src/types/schema";

function table(name: string): SchemaTable {
  return {
    id: `public.${name}`,
    name,
    schema: undefined,
    columns: [
      {
        name: "id",
        type: "int",
        isPrimaryKey: true,
        isNullable: false,
        isUnique: false,
      },
    ],
    indexes: [],
  };
}

function files(): { relativePath: string }[] {
  return Object.keys(disk).map((relativePath) => ({ relativePath }));
}

function openContents(): Record<string, string> {
  return useEditorStore.getState().getOpenFileContents();
}

beforeEach(() => {
  for (const key of Object.keys(disk)) {
    delete disk[key];
  }
  useEditorStore.setState({
    tabs: [],
    activePath: null,
    contentRevision: 0,
  });
});

describe("applyAssignTableToGroup", () => {
  it("writes a new group to the diagram's file, not another file with the same table", async () => {
    disk["cali.dbml"] = "Table users {\n  id int [pk]\n}\n";
    disk["sandy.dbml"] = "Table users {\n  id int [pk]\n}\n";

    await applyAssignTableToGroup(table("users"), { name: "users_group" }, files(), {
      entryPoint: "sandy.dbml",
      projectScope: "folder",
    });

    const contents = openContents();
    expect(contents["sandy.dbml"]).toContain("TableGroup users_group {");
    expect(contents["cali.dbml"]).toBeUndefined();
  });

  it("leaves groups in unrelated diagrams untouched", async () => {
    disk["a.dbml"] =
      "Table users {\n  id int [pk]\n}\n\nTableGroup auth {\n  users\n}\n";
    disk["b.dbml"] = "Table users {\n  id int [pk]\n}\n";

    await applyAssignTableToGroup(table("users"), { name: "core" }, files(), {
      entryPoint: "b.dbml",
      projectScope: "folder",
    });

    const contents = openContents();
    expect(contents["a.dbml"]).toBeUndefined();
    expect(contents["b.dbml"]).toContain("TableGroup core {");
  });

  it("follows imports from the entry point and adds to an existing group there", async () => {
    disk["main.dbml"] =
      "use {\n  users\n} from './tables/users.dbml'\n";
    disk["tables/users.dbml"] =
      "Table users {\n  id int [pk]\n}\n\nTable posts {\n  id int [pk]\n}\n\nTableGroup core {\n  posts\n}\n";
    disk["other.dbml"] =
      "Table users {\n  id int [pk]\n}\n\nTableGroup core {\n  users\n}\n";

    await applyAssignTableToGroup(
      table("users"),
      { name: "core" },
      files(),
      { entryPoint: "main.dbml", projectScope: "folder" },
    );

    const contents = openContents();
    expect(contents["tables/users.dbml"]).toContain(
      "TableGroup core {\n  posts\n  users\n}",
    );
    expect(contents["other.dbml"]).toBeUndefined();
  });
});
