import { describe, expect, it } from "vitest";
import { schemaToFlow } from "../../src/features/schema/schemaToFlow";
import type { SchemaModel } from "../../src/types/schema";

describe("schemaToFlow edge count", () => {
  it("creates one diagram edge per reference (not per column pair)", () => {
    const model: SchemaModel = {
      tables: [
        {
          id: "a",
          name: "a",
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
          id: "b",
          name: "b",
          columns: [
            {
              name: "a_id",
              type: "int",
              isPrimaryKey: false,
              isNullable: false,
              isUnique: false,
            },
            {
              name: "a_id2",
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
          id: "composite",
          sourceTableId: "b",
          sourceColumns: ["a_id", "a_id2"],
          targetTableId: "a",
          targetColumns: ["id", "id"],
        },
      ],
      enums: [],
    };

    const { edges } = schemaToFlow(model);
    expect(edges).toHaveLength(2);
    expect(edges[0].sourceHandle).toBe("source:a_id");
    expect(edges[1].sourceHandle).toBe("source:a_id2");
  });
});
