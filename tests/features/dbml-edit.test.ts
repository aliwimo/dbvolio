import { describe, expect, it } from "vitest";
import {
  addColumnToContent,
  findTableBlock,
  moveColumnInContent,
  removeColumnFromContent,
  updateColumnInContent,
  setTableHeaderColorInContent,
  rewriteTableReferencesInContent,
  updateTableHeaderInContent,
} from "../../src/features/schema/dbml-edit";
import type { SchemaTable } from "../../src/types/schema";

const usersTable: SchemaTable = {
  id: "users",
  name: "users",
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

const sampleDbml = `Table users {
  id int [pk, not null]
  email varchar [unique, not null]
}
`;

describe("dbml-edit", () => {
  it("finds a table block", () => {
    const block = findTableBlock(sampleDbml, usersTable);
    expect(block).not.toBeNull();
    expect(block?.startLine).toBe(0);
  });

  it("adds a column at the end by default", () => {
    const next = addColumnToContent(sampleDbml, usersTable, {
      name: "created_at",
      type: "timestamptz",
      isPrimaryKey: false,
      isNullable: true,
      isUnique: false,
    });
    expect(next).toContain("created_at timestamptz");
    const lines = next.split("\n");
    expect(lines.indexOf("  created_at timestamptz")).toBeGreaterThan(
      lines.findIndex((l) => l.includes("email varchar")),
    );
  });

  it("adds a column after a specific field", () => {
    const next = addColumnToContent(
      sampleDbml,
      usersTable,
      {
        name: "middle",
        type: "int",
        isPrimaryKey: false,
        isNullable: true,
        isUnique: false,
      },
      { afterColumn: "id" },
    );
    const lines = next.split("\n");
    expect(lines.indexOf("  middle int")).toBe(
      lines.findIndex((l) => l.includes("id int")) + 1,
    );
  });

  it("moves a column up in the table block", () => {
    const next = moveColumnInContent(sampleDbml, usersTable, "email", "up");
    const lines = next.split("\n").filter((l) => l.trim().startsWith("id") || l.includes("email"));
    expect(lines[0]).toContain("email");
    expect(lines[1]).toContain("id");
  });

  it("removes a column line", () => {
    const next = removeColumnFromContent(sampleDbml, usersTable, "email");
    expect(next).not.toContain("email varchar");
    expect(next).toContain("id int");
  });

  it("updates a column line", () => {
    const next = updateColumnInContent(sampleDbml, usersTable, "email", {
      name: "email",
      type: "text",
      isPrimaryKey: false,
      isNullable: false,
      isUnique: true,
    });
    expect(next).toContain("email text [not null, unique]");
  });

  it("updates table header schema and name", () => {
    const next = updateTableHeaderInContent(sampleDbml, usersTable, {
      name: "accounts",
      schema: "auth",
    });
    expect(next).toMatch(/Table auth\.accounts/);
  });

  it("writes headerColor in DBML table settings", () => {
    const next = setTableHeaderColorInContent(
      sampleDbml,
      usersTable,
      "#6366f1",
    );
    expect(next).toMatch(/Table users \[headerColor: #6366f1\]/);
  });

  it("preserves headerColor when renaming table", () => {
    const colored = setTableHeaderColorInContent(
      sampleDbml,
      usersTable,
      "#0ea5e9",
    );
    const next = updateTableHeaderInContent(colored, usersTable, {
      name: "accounts",
    });
    expect(next).toMatch(/Table accounts \[headerColor: #0ea5e9\]/);
  });

  it("rewrites standalone Ref lines when a table is renamed", () => {
    const dbml = `Table posts {
  author_id int
}

Ref: posts.author_id > users.id
`;
    const next = rewriteTableReferencesInContent(
      dbml,
      { name: "users" },
      { name: "accounts" },
    );
    expect(next).toContain("Ref: posts.author_id > accounts.id");
    expect(next).not.toMatch(/>\s*users\./);
  });

  it("rewrites inline column refs when schema is added", () => {
    const dbml = `Table posts {
  author_id int [ref: > users.id]
}
`;
    const next = rewriteTableReferencesInContent(
      dbml,
      { name: "users" },
      { schema: "auth", name: "users" },
    );
    expect(next).toContain("[ref: > auth.users.id]");
  });

  it("rewrites composite Ref endpoints", () => {
    const dbml = "Ref: shipments.(order_id) > orders.(id)\n";
    const next = rewriteTableReferencesInContent(
      dbml,
      { name: "orders" },
      { schema: "sales", name: "orders" },
    );
    expect(next).toBe("Ref: shipments.(order_id) > sales.orders.(id)\n");
  });

  it("removes headerColor from table settings", () => {
    const colored = setTableHeaderColorInContent(
      sampleDbml,
      usersTable,
      "#6366f1",
    );
    const next = setTableHeaderColorInContent(colored, usersTable, null);
    expect(next).not.toMatch(/headerColor/);
    expect(next).toMatch(/^Table users \{/m);
  });
});
