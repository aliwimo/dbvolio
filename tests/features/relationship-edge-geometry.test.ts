import { describe, expect, it } from "vitest";
import { computeOrthogonalPath } from "../../src/components/diagram/RelationshipEdge";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_STRIDE,
  columnHandleOffsetY,
  getRelationshipEdgePoints,
} from "../../src/features/diagram/relationship-edge-geometry";
import type { Edge, Node } from "../../src/types/flow";
import type { TableNodeData } from "../../src/components/diagram/TableNode";

function tableNode(
  id: string,
  x: number,
  y: number,
  columns: string[],
): Node<TableNodeData> {
  return {
    id,
    position: { x, y },
    data: {
      table: {
        id,
        name: id,
        columns: columns.map((name) => ({
          name,
          type: "int",
          isPrimaryKey: false,
        })),
      },
      foreignKeys: new Set(),
    },
  };
}

describe("getRelationshipEdgePoints", () => {
  it("anchors Y on source and target column handles", () => {
    const users = tableNode("users", 0, 0, ["id", "email"]);
    const posts = tableNode("posts", 400, 0, ["id", "user_id"]);
    const edge: Edge = {
      id: "posts-users",
      source: "posts",
      target: "users",
      sourceHandle: "source:user_id",
      targetHandle: "target:id",
    };
    const points = getRelationshipEdgePoints(edge, posts, users);
    expect(points).not.toBeNull();
    const padding = 4;
    expect(points?.sourceY).toBe(
      posts.position.y +
        TABLE_HEADER_HEIGHT +
        padding +
        TABLE_ROW_STRIDE +
        TABLE_ROW_STRIDE / 2,
    );
    expect(points?.targetY).toBe(
      users.position.y +
        TABLE_HEADER_HEIGHT +
        padding +
        TABLE_ROW_STRIDE / 2,
    );
    expect(points?.sourceX).toBeGreaterThan(points?.targetX ?? 0);
  });

  it("moves endpoints when table positions change", () => {
    const a = tableNode("a", 0, 0, ["id"]);
    const b = tableNode("b", 300, 100, ["id"]);
    const edge: Edge = {
      id: "a-b",
      source: "a",
      target: "b",
      sourceHandle: "source:id",
      targetHandle: "target:id",
    };
    const first = getRelationshipEdgePoints(edge, a, b);
    const moved = { ...b, position: { x: 320, y: 180 } };
    const second = getRelationshipEdgePoints(edge, a, moved);
    expect(second.sourceY).toBe(first?.sourceY);
    expect(second.targetY).not.toBe(first?.targetY);
    expect(second.targetX).toBe(320);
  });
});

describe("computeOrthogonalPath", () => {
  it("starts and ends on the column anchors", () => {
    const [d, labelX, labelY, arrow] = computeOrthogonalPath({
      sourceX: 260,
      sourceY: 80,
      targetX: 400,
      targetY: 140,
      sourceSide: "right",
      targetSide: "left",
    });
    expect(d.startsWith("M 260 80 L ")).toBe(true);
    expect(d.endsWith("L 400 140")).toBe(true);
    expect(d.includes("C ")).toBe(false);
    expect(d.includes(" Q ")).toBe(true);
    expect(arrow).toBe("M 397.5 140 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0");
    expect(labelX).toBe(330);
    expect(labelY).toBe(110);
  });
});

describe("columnHandleOffsetY", () => {
  it("falls back to vertical center when column is missing", () => {
    const node = tableNode("t", 0, 0, ["only"]);
    const offset = columnHandleOffsetY(node, "source:missing");
    expect(offset).toBe(35);
  });
});
