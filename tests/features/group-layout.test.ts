import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { applyDagreLayoutWithOptions } from "../../src/features/diagram-layout/dagre-layout";
import { layoutNodeBounds } from "../../src/features/diagram-layout/layout-node-bounds";
import { layoutNodeSize } from "../../src/features/diagram-layout/layout-node-bounds";
import { tableGroupOuterBox } from "../../src/features/diagram-layout/group-layout-bounds";
import { GROUP_PADDING_X, GROUP_PADDING_TOP } from "../../src/features/diagram-layout/table-group-bounds";

function tableNode(id: string, groupId?: string, columns = 2): Node {
  return {
    id,
    type: "tableNode",
    position: { x: 100, y: 100 },
    data: {
      table: {
        name: id,
        groupId,
        columns: Array.from({ length: columns }, (_, i) => ({ name: `c${i}` })),
      },
    },
  };
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

describe("group-aware auto layout", () => {
  it("keeps grouped tables in a tight cluster when auto-arranging", () => {
    const nodes = [
      tableNode("a", "g1"),
      tableNode("b", "g1"),
      tableNode("c", "g1"),
      tableNode("solo"),
    ];
    const edges = [edge("solo", "a")];
    const laidOut = applyDagreLayoutWithOptions(nodes, edges, {
      algorithm: "left-right",
      rankdir: "LR",
      spacing: "default",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    });

    const grouped = laidOut.filter(
      (n) =>
        (n.data as { table?: { groupId?: string } }).table?.groupId === "g1",
    );
    const bounds = layoutNodeBounds(grouped, layoutNodeSize);
    const spanX = bounds.maxX - bounds.minX;
    const spanY = bounds.maxY - bounds.minY;

    expect(spanX).toBeLessThan(900);
    expect(spanY).toBeLessThan(420);
  });

  it("updates group bounds from member positions after layout", () => {
    const nodes = [
      {
        id: "group:g1",
        type: "tableGroupNode",
        position: { x: 0, y: 0 },
        data: {
          group: { id: "g1", name: "G1", tableIds: ["a", "b"] },
        },
      },
      tableNode("a", "g1"),
      tableNode("b", "g1"),
    ];
    const laidOut = applyDagreLayoutWithOptions(nodes, [], {
      algorithm: "left-right",
      rankdir: "LR",
      spacing: "default",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    });
    const group = laidOut.find((n) => n.id === "group:g1")!;
    const tables = laidOut.filter((n) => n.type === "tableNode");
    const tableBounds = layoutNodeBounds(tables, layoutNodeSize);

    expect(group.position.x).toBeLessThanOrEqual(
      tableBounds.minX - GROUP_PADDING_X + 1,
    );
    expect(group.position.y).toBeLessThanOrEqual(
      tableBounds.minY - GROUP_PADDING_TOP + 1,
    );
    expect(group.width).toBeGreaterThan(200);
    expect(group.height).toBeGreaterThan(100);
  });

  it("does not overlap group frames or tables after auto-arrange", () => {
    const nodes = [
      {
        id: "group:g1",
        type: "tableGroupNode",
        position: { x: 0, y: 0 },
        data: {
          group: { id: "g1", name: "G1", tableIds: ["a", "b", "c"] },
        },
      },
      {
        id: "group:g2",
        type: "tableGroupNode",
        position: { x: 0, y: 0 },
        data: {
          group: {
            id: "g2",
            name: "G2",
            note: "billing",
            tableIds: ["d", "e"],
          },
        },
      },
      tableNode("a", "g1"),
      tableNode("b", "g1"),
      tableNode("c", "g1"),
      tableNode("d", "g2"),
      tableNode("e", "g2"),
      tableNode("solo"),
    ];
    const edges = [edge("solo", "a"), edge("b", "d"), edge("c", "e")];
    const laidOut = applyDagreLayoutWithOptions(nodes, edges, {
      algorithm: "left-right",
      rankdir: "LR",
      spacing: "default",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    });

    const tables = laidOut.filter((n) => n.type === "tableNode");
    const g1 = tableGroupOuterBox(
      tables.filter(
        (n) =>
          (n.data as { table?: { groupId?: string } }).table?.groupId === "g1",
      ),
    );
    const g2 = tableGroupOuterBox(
      tables.filter(
        (n) =>
          (n.data as { table?: { groupId?: string } }).table?.groupId === "g2",
      ),
      true,
    );
    const solo = tables.find((n) => n.id === "solo")!;
    const soloSize = layoutNodeSize(solo);
    const soloBox = {
      x: solo.position.x,
      y: solo.position.y,
      width: soloSize.width,
      height: soloSize.height,
    };

    const gap = 8;
    const overlaps = (
      a: { x: number; y: number; width: number; height: number },
      b: { x: number; y: number; width: number; height: number },
    ) =>
      !(
        a.x + a.width + gap <= b.x ||
        b.x + b.width + gap <= a.x ||
        a.y + a.height + gap <= b.y ||
        b.y + b.height + gap <= a.y
      );

    expect(overlaps(g1, g2)).toBe(false);
    expect(overlaps(g1, soloBox)).toBe(false);
    expect(overlaps(g2, soloBox)).toBe(false);

    for (const table of tables.filter(
      (n) =>
        (n.data as { table?: { groupId?: string } }).table?.groupId === "g1",
    )) {
      const size = layoutNodeSize(table);
      expect(table.position.x).toBeGreaterThanOrEqual(g1.x - 1);
      expect(table.position.y).toBeGreaterThanOrEqual(g1.y - 1);
      expect(table.position.x + size.width).toBeLessThanOrEqual(
        g1.x + g1.width + 1,
      );
      expect(table.position.y + size.height).toBeLessThanOrEqual(
        g1.y + g1.height + 1,
      );
    }
  });
});
