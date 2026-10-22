import { describe, expect, it } from "vitest";
import {
  addColumnToContent,
  addTableToGroupInContent,
  findTableBlock,
  findTableGroupBlock,
  formatNewTableGroupBlock,
  moveColumnInContent,
  removeColumnFromContent,
  removeTableFromAllTableGroupsInContent,
  updateColumnInContent,
  setTableHeaderColorInContent,
  rewriteTableReferencesInContent,
  updateTableHeaderInContent,
  formatNewTableBlock,
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

  it("finds a table group block by schema and name", () => {
    const dbml = `TableGroup sales.core {
  users
}
`;
    const block = findTableGroupBlock(dbml, { schema: "sales", name: "core" });
    expect(block).not.toBeNull();
    expect(block?.startLine).toBe(0);
    expect(findTableGroupBlock(dbml, { name: "missing" })).toBeNull();
  });

  it("adds a table to an existing group without duplicating it", () => {
    const dbml = `Table users {
  id int
}
Table posts {
  id int
}
TableGroup core {
  users
}
`;
    const next = addTableToGroupInContent(
      dbml,
      { name: "core" },
      { name: "posts" },
    );
    expect(next).toMatch(/TableGroup core \{\n  users\n  posts\n\}/);
    expect(
      addTableToGroupInContent(next, { name: "core" }, { name: "posts" }),
    ).toBe(next);
  });

  it("expands an inline group block when adding a table", () => {
    const dbml = `Table users {
  id int
}
Table posts {
  id int
}
TableGroup core { users }
`;
    const next = addTableToGroupInContent(
      dbml,
      { name: "core" },
      { name: "posts" },
    );
    expect(next).toContain("TableGroup core {\n  users\n  posts\n}");
  });

  it("qualifies cross-schema tables when adding to a group", () => {
    const dbml = `TableGroup sales.core {
  orders
}
`;
    const next = addTableToGroupInContent(
      dbml,
      { schema: "sales", name: "core" },
      { name: "users" },
    );
    expect(next).toContain("public.users");
  });

  it("removes a table from every group it belongs to", () => {
    const dbml = `Table users {
  id int
}
TableGroup core {
  users
  posts
}
TableGroup other {
  users
}
`;
    const next = removeTableFromAllTableGroupsInContent(dbml, {
      name: "users",
    });
    expect(next).toMatch(/TableGroup core \{\n  posts\n\}/);
    expect(next).toMatch(/TableGroup other \{\n\}/);
    expect(
      removeTableFromAllTableGroupsInContent(next, { name: "users" }),
    ).toBe(next);
  });

  it("removes a table from an inline group block", () => {
    const dbml = `TableGroup core { users posts }
`;
    const next = removeTableFromAllTableGroupsInContent(dbml, {
      name: "users",
    });
    expect(next.trim()).toBe("TableGroup core { posts }");
  });

  it("formats a new table group block", () => {
    const block = formatNewTableGroupBlock(
      { schema: "sales", name: "core" },
      { schema: "sales", name: "orders" },
    );
    expect(block).toBe("TableGroup sales.core {\n  orders\n}\n");
  });

  it("formats a new table block with default id column", () => {
    const block = formatNewTableBlock({ name: "orders" });
    expect(block).toContain("Table orders {");
    expect(block).toContain("  id serial [pk, not null]");
    expect(block).toContain("}");
  });

  it("formats a new table block with schema and custom columns", () => {
    const block = formatNewTableBlock({
      name: "items",
      schema: "sales",
      headerColor: "#6366f1",
      columns: [
        {
          name: "item_id",
          type: "uuid",
          isPrimaryKey: true,
          isNullable: false,
          isUnique: false,
        },
        {
          name: "price",
          type: "numeric",
          isPrimaryKey: false,
          isNullable: false,
          isUnique: false,
        },
      ],
    });
    expect(block).toContain("Table sales.items [headercolor: #6366f1] {");
    expect(block).toContain("  item_id uuid [pk, not null]");
    expect(block).toContain("  price numeric [not null]");
  });
});
