import { describe, expect, it } from "vitest";
import { splitDbmlFilePath } from "../../src/features/projects/split-dbml-file-path";

describe("splitDbmlFilePath", () => {
  it("preserves leading slash on macOS paths", () => {
    expect(splitDbmlFilePath("/Users/ali/project/cali.dbml")).toEqual({
      projectRoot: "/Users/ali/project",
      relativePath: "cali.dbml",
    });
  });

  it("handles Windows paths", () => {
    expect(splitDbmlFilePath("C:\\Users\\ali\\project\\cali.dbml")).toEqual({
      projectRoot: "C:\\Users\\ali\\project",
      relativePath: "cali.dbml",
    });
  });
});
