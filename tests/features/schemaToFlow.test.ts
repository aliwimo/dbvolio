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

  it("creates tableGroupNode and inherits group color on member tables without headerColor", () => {
    const withGroup: SchemaModel = {
      ...sample,
      tables: sample.tables.map((t) => ({
        ...t,
        groupId: "public.Core",
      })),
      tableGroups: [
        {
          id: "public.Core",
          name: "Core",
          color: "#E74C3C",
          note: "Core entities",
          tableIds: ["users", "posts"],
        },
      ],
    };
    const { nodes } = schemaToFlow(withGroup);
    expect(nodes).toHaveLength(3);
    const groupNode = nodes.find((n) => n.type === "tableGroupNode");
    expect(groupNode).toBeDefined();
    expect(groupNode?.id).toBe("group:public.Core");
    const userNode = nodes.find((n) => n.id === "users");
    expect((userNode?.data as { headerColor?: string }).headerColor).toBe(
      "#E74C3C",
    );
  });
});
