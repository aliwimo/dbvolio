import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseProject } from "../../src/services/dbml-parser";

const fixtureRoot = join(process.cwd(), "tests/fixtures/multifile");
const projectRoot = "/fixture-project";

function readFixture(relative: string): string {
  return readFileSync(join(fixtureRoot, relative), "utf8");
}

describe("dbml-parser", () => {
  it("parses multi-file project via use imports", () => {
    const files = {
      "main.dbml": readFixture("main.dbml"),
      "tables/users.dbml": readFixture("tables/users.dbml"),
      "tables/posts.dbml": readFixture("tables/posts.dbml"),
    };
    const result = parseProject(projectRoot, files, "main.dbml");
    expect(result.diagnostics).toHaveLength(0);
    expect(result.model).not.toBeNull();
    expect(result.model!.tables).toHaveLength(2);
    expect(result.model!.references).toHaveLength(1);
    expect(result.model!.tables.map((t) => t.name).sort()).toEqual([
      "posts",
      "users",
    ]);
  });

  it("orients inline column refs FK → PK for diagram handles", () => {
    const result = parseProject(
      projectRoot,
      {
        "main.dbml": `Table households {
  id uuid [pk]
}
Table activities {
  id uuid [pk]
  household_id uuid [ref: > households.id]
}`,
      },
      "main.dbml",
    );
    expect(result.diagnostics).toHaveLength(0);
    expect(result.model!.references).toHaveLength(1);
    const ref = result.model!.references[0];
    expect(ref.sourceTableId).toBe("public.activities");
    expect(ref.sourceColumns).toEqual(["household_id"]);
    expect(ref.targetTableId).toBe("public.households");
    expect(ref.targetColumns).toEqual(["id"]);
  });

  it("parses table headerColor from DBML settings", () => {
    const result = parseProject(
      projectRoot,
      {
        "main.dbml": `Table users [headerColor: #6366f1] {
  id int [pk]
}`,
      },
      "main.dbml",
    );
    expect(result.diagnostics).toHaveLength(0);
    const users = result.model!.tables.find((t) => t.name === "users");
    expect(users?.headerColor?.toLowerCase()).toBe("#6366f1");
  });

  it("returns diagnostics for invalid syntax", () => {
    const result = parseProject(
      projectRoot,
      { "main.dbml": "Table broken { id int" },
      "main.dbml",
    );
    expect(result.model).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("parses composite foreign keys", () => {
    const source = readFileSync(
      join(process.cwd(), "tests/fixtures/composite-fk.dbml"),
      "utf8",
    );
    const result = parseProject(
      projectRoot,
      { "composite-fk.dbml": source },
      "composite-fk.dbml",
    );
    expect(result.diagnostics).toHaveLength(0);
    expect(result.model!.tables.length).toBeGreaterThanOrEqual(3);
    expect(result.model!.references.length).toBeGreaterThanOrEqual(2);
  });
});
