import { describe, expect, it } from "vitest";
import { normalizePendingOpens } from "../../src/features/open/normalize-pending-opens";

describe("normalizePendingOpens", () => {
  it("prefers file open over folder open for the same root", () => {
    const result = normalizePendingOpens([
      { projectRoot: "/tmp/project", relativePath: undefined },
      { projectRoot: "/tmp/project", relativePath: "cali.dbml" },
    ]);
    expect(result).toEqual([
      { projectRoot: "/tmp/project", relativePath: "cali.dbml" },
    ]);
  });
});
