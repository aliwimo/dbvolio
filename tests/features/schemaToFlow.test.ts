import { describe, expect, it } from "vitest";
import { schemaToFlow } from "../../src/features/schema/schemaToFlow";
import type { SchemaModel } from "../../src/types/schema";

const sample: SchemaModel = {
  tables: [
    {
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
    },
    {
      id: "posts",
      name: "posts",
      columns: [
        {
          name: "user_id",
          type: "int",
          isPrimaryKey: false,
          isNullable: false,
          isUnique: false,
        },
      ],
      indexes: [],
    },
  ],
  references: [
    {
      id: "ref1",
      sourceTableId: "posts",
      sourceColumns: ["user_id"],
      targetTableId: "users",
      targetColumns: ["id"],
    },
  ],
  enums: [],
};

describe("schemaToFlow", () => {
  it("maps tables and references to nodes and edges", () => {
    const { nodes, edges } = schemaToFlow(sample);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(sample.references.length);
    expect(edges[0].source).toBe("posts");
    expect(edges[0].target).toBe("users");
    expect(edges[0].sourceHandle).toBe("source:user_id");
    expect(edges[0].targetHandle).toBe("target:id");
  });
});
