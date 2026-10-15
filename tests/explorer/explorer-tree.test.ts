import { describe, expect, it } from "vitest";
import {
  ancestorFolderPaths,
  buildTree,
  collectFolderPaths,
  filterDbmlEntries,
  filterTree,
} from "../../src/components/explorer/explorer-tree";

describe("explorer-tree", () => {
  it("keeps folders that contain dbml files", () => {
    const filtered = filterDbmlEntries([
      { relativePath: "tables", isDirectory: true },
      { relativePath: "tables/users.dbml", isDirectory: false },
      { relativePath: "readme.md", isDirectory: false },
    ]);
    expect(filtered.map((f) => f.relativePath)).toEqual([
      "tables",
      "tables/users.dbml",
    ]);
  });

  it("lists folder paths for collapse all", () => {
    const tree = buildTree([
      { relativePath: "a", isDirectory: true },
      { relativePath: "a/one.dbml", isDirectory: false },
      { relativePath: "b", isDirectory: true },
      { relativePath: "b/nested", isDirectory: true },
      { relativePath: "b/nested/two.dbml", isDirectory: false },
    ]);
    expect(collectFolderPaths(tree).sort()).toEqual(["a", "b", "b/nested"]);
  });

  it("lists ancestor folders for reveal", () => {
    expect(ancestorFolderPaths("src/models/user.dbml")).toEqual([
      "src",
      "src/models",
    ]);
  });

  it("filters tree nodes by query", () => {
    const tree = buildTree([
      { relativePath: "a", isDirectory: true },
      { relativePath: "a/one.dbml", isDirectory: false },
      { relativePath: "a/two.dbml", isDirectory: false },
    ]);
    const result = filterTree(tree, "two");
    expect(result).toHaveLength(1);
    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children[0]?.name).toBe("two.dbml");
  });
});
