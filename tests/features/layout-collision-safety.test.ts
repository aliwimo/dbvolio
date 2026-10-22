import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { applyDagreLayoutWithOptions } from "../../src/features/diagram-layout/dagre-layout";
import { applyAlgorithmLayout } from "../../src/features/diagram-layout/layout-algorithms";
import type { AutoLayoutOptions } from "../../src/features/diagram-layout/layout-options";
import { layoutNodeSize } from "../../src/features/diagram-layout/layout-node-bounds";
import { tableGroupOuterBox } from "../../src/features/diagram-layout/group-layout-bounds";
import { buildGroupLayoutEdges } from "../../src/features/diagram-layout/table-group-bounds";
import {
  collectTableGroupMemberships,
  expandTargetIdsWithWholeGroups,
} from "../../src/features/diagram-layout/group-layout";
import { componentForNode } from "../../src/features/diagram-layout/layout-graph";
import { separateBoxes } from "../../src/features/diagram-layout/layout-spacing";

const ALGORITHMS = [
  "left-right",
  "pipeline",
  "snowflake",
  "compact",
] as const;

function tableNode(id: string, groupId?: string, columns = 3): Node {
  return {
    id,
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: {
      table: {
        name: id,
        groupId,
        columns: Array.from({ length: columns }, (_, i) => ({ name: `c${i}` })),
      },
    },
  };
}

function groupNode(
  id: string,
  tableIds: string[],
  note?: string,
): Node {
  return {
    id: `group:${id}`,
    type: "tableGroupNode",
    position: { x: 0, y: 0 },
    data: { group: { id, name: id, note, tableIds } },
  };
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

function rectOf(node: Node) {
  const { width, height } = layoutNodeSize(node);
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  };
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap = 0,
): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

function tableCollisions(nodes: Node[]): string[] {
  const tables = nodes.filter((node) => node.type === "tableNode");
  const collisions: string[] = [];
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      if (overlaps(rectOf(tables[i]), rectOf(tables[j]))) {
        collisions.push(`${tables[i].id} ↔ ${tables[j].id}`);
      }
    }
  }
  return collisions;
}

function groupFrameCollisions(nodes: Node[]): string[] {
  const tables = nodes.filter((node) => node.type === "tableNode");
  const notes = new Map<string, boolean>();
  for (const node of nodes.filter((n) => n.type === "tableGroupNode")) {
    const group = (node.data as { group?: { id: string; note?: string } }).group;
    if (group) {
      notes.set(group.id, Boolean(group.note?.trim()));
    }
  }

  const groupTables = new Map<string, Node[]>();
  const solos: Node[] = [];
  for (const table of tables) {
    const groupId = (table.data as { table: { groupId?: string } }).table
      .groupId;
    if (!groupId) {
      solos.push(table);
      continue;
    }
    const members = groupTables.get(groupId) ?? [];
    members.push(table);
    groupTables.set(groupId, members);
  }

  const frames = [...groupTables.entries()].map(([id, members]) => ({
    id,
    ...tableGroupOuterBox(members, notes.get(id) ?? false),
  }));

  const collisions: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      if (overlaps(frames[i], frames[j])) {
        collisions.push(`frame ${frames[i].id} ↔ frame ${frames[j].id}`);
      }
    }
    for (const solo of solos) {
      if (overlaps(frames[i], rectOf(solo))) {
        collisions.push(`frame ${frames[i].id} ↔ ${solo.id}`);
      }
    }
  }
  return collisions;
}

function runLayout(
  nodes: Node[],
  edges: Edge[],
  options: AutoLayoutOptions,
): Node[] {
  return options.algorithm === "left-right"
    ? applyDagreLayoutWithOptions(nodes, edges, options)
    : applyAlgorithmLayout(nodes, edges, options);
}

function clusteredGraph(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const blockOrigin = new Map<string, { x: number; y: number }>([
    ["g0", { x: 0, y: 0 }],
    ["g1", { x: 2400, y: 0 }],
    ["solo", { x: 0, y: 2400 }],
  ]);
  const blockCount = new Map<string, number>();

  for (let i = 0; i < 22; i++) {
    const groupId = i < 8 ? "g0" : i < 16 ? "g1" : undefined;
    const block = groupId ?? "solo";
    const index = blockCount.get(block) ?? 0;
    blockCount.set(block, index + 1);

    const columns = 2 + (i % 7);
    const node = tableNode(`t${i}`, groupId, columns);
    const origin = blockOrigin.get(block)!;
    node.position = {
      x: origin.x + (index % 3) * 650,
      y: origin.y + Math.floor(index / 3) * 520,
    };
    if (i % 4 === 0) {
      node.measured = { width: 240 + i * 12, height: 36 + columns * 34 + 8 };
    }
    nodes.push(node);
  }

  const byGroup = new Map<string, string[]>();
  for (const node of nodes) {
    const groupId = (node.data as { table: { groupId?: string } }).table
      .groupId;
    if (groupId) {
      const ids = byGroup.get(groupId) ?? [];
      ids.push(node.id);
      byGroup.set(groupId, ids);
    }
  }
  for (const [groupId, tableIds] of byGroup) {
    nodes.push(
      groupNode(groupId, tableIds, groupId === "g1" ? "billing" : undefined),
    );
  }

  const edges = [
    edge("t0", "t1"),
    edge("t1", "t2"),
    edge("t2", "t6"),
    edge("t3", "t8"),
    edge("t4", "t9"),
    edge("t5", "t10"),
    edge("t7", "t12"),
    edge("t11", "t16"),
    edge("t13", "t18"),
    edge("t14", "t19"),
    edge("t15", "t20"),
  ];
  return { nodes, edges };
}

const baseOptions: AutoLayoutOptions = {
  algorithm: "left-right",
  rankdir: "LR",
  spacing: "default",
  scope: "all",
  selectedNodeId: null,
  separateComponents: true,
};

describe("auto-layout collision safety", () => {
  it("separates a pile of identical boxes", () => {
    const boxes = Array.from({ length: 40 }, (_, i) => ({
      id: `b${i}`,
      x: 0,
      y: 0,
      width: 260,
      height: 100,
      movable: true,
    }));
    const positions = separateBoxes(boxes, 12);
    const rects = boxes.map((box) => ({
      ...positions.get(box.id)!,
      width: box.width,
      height: box.height,
    }));
    const collisions: string[] = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (overlaps(rects[i], rects[j], 12)) {
          collisions.push(`${boxes[i].id} ↔ ${boxes[j].id}`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });
  it("keeps tables and group frames apart for every algorithm", () => {
    for (const algorithm of ALGORITHMS) {
      for (const separateComponents of [true, false]) {
        const { nodes, edges } = clusteredGraph();
        const laidOut = runLayout(nodes, edges, {
          ...baseOptions,
          algorithm,
          separateComponents,
        });

        expect({
          algorithm,
          separateComponents,
          tables: tableCollisions(laidOut),
          frames: groupFrameCollisions(laidOut),
        }).toEqual({
          algorithm,
          separateComponents,
          tables: [],
          frames: [],
        });
      }
    }
  });

  it("uses measured table sizes when arranging wide tables", () => {
    for (const algorithm of ALGORITHMS) {
      const nodes = Array.from({ length: 9 }, (_, i) => {
        const node = tableNode(`wide${i}`, undefined, 4);
        node.data.table.name = `${"long_table_name_".repeat(2)}${i}`;
        node.measured = { width: 520, height: 180 };
        return node;
      });
      const laidOut = runLayout(nodes, [], {
        ...baseOptions,
        algorithm,
        separateComponents: false,
      });
      expect({ algorithm, collisions: tableCollisions(laidOut) }).toEqual({
        algorithm,
        collisions: [],
      });
    }
  });

  it("never moves or overlaps fixed tables when arranging a selection", () => {
    for (const algorithm of ALGORITHMS) {
      const { nodes, edges } = clusteredGraph();
      expect(tableCollisions(nodes)).toEqual([]);
      expect(groupFrameCollisions(nodes)).toEqual([]);
      const laidOut = runLayout(nodes, edges, {
        ...baseOptions,
        algorithm,
        scope: "selection",
        selectedNodeId: "t5",
      });

      const tableNodes = nodes.filter((node) => node.type === "tableNode");
      const layoutEdges = buildGroupLayoutEdges(tableNodes, edges);
      const targetIds = new Set(
        expandTargetIdsWithWholeGroups(
          componentForNode(
            "t5",
            tableNodes.map((node) => node.id),
            layoutEdges,
          ),
          collectTableGroupMemberships(tableNodes).memberships,
        ),
      );
      const originalById = new Map(nodes.map((node) => [node.id, node]));
      const moved = (node: Node) => {
        const original = originalById.get(node.id);
        return (
          original != null &&
          (Math.abs(original.position.x - node.position.x) > 0.5 ||
            Math.abs(original.position.y - node.position.y) > 0.5)
        );
      };

      const fixedTables = laidOut.filter(
        (node) => node.type === "tableNode" && !targetIds.has(node.id),
      );
      const fixedDrift = fixedTables.filter(moved);

      const movedIds = new Set(
        laidOut.filter(moved).map((node) => node.id),
      );

      expect(groupFrameCollisions(laidOut)).toEqual([]);

      expect({
        algorithm,
        collisions: tableCollisions(laidOut),
        fixedDrift: fixedDrift.map((node) => node.id),
        anchorStayed: !movedIds.has("t5"),
        otherTargetsMoved: [...targetIds].some(
          (id) => id !== "t5" && movedIds.has(id),
        ),
      }).toEqual({
        algorithm,
        collisions: [],
        fixedDrift: [],
        anchorStayed: true,
        otherTargetsMoved: true,
      });
    }
  });
});
