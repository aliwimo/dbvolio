import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { applyAlgorithmLayout } from "../../src/features/diagram-layout/layout-algorithms";
import { NODE_WIDTH, tableNodeHeight } from "../../src/features/diagram-layout/dagre-layout";

function tableNode(id: string, columns = 3): Node {
  return {
    id,
    type: "table",
    position: { x: 0, y: 0 },
    data: { table: { name: id, columns: Array.from({ length: columns }, (_, i) => ({ name: `c${i}` })) } },
  };
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}

function hasOverlaps(nodes: Node[], gap = 0): boolean {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const ax2 = a.position.x + NODE_WIDTH;
      const ay2 = a.position.y + tableNodeHeight(a);
      const bx2 = b.position.x + NODE_WIDTH;
      const by2 = b.position.y + tableNodeHeight(b);
      const separated =
        ax2 + gap <= b.position.x ||
        bx2 + gap <= a.position.x ||
        ay2 + gap <= b.position.y ||
        by2 + gap <= a.position.y;
      if (!separated) {
        return true;
      }
    }
  }
  return false;
}

describe("applyAlgorithmLayout", () => {
  it("pipeline orders nodes by dependency depth left to right", () => {
    const nodes = [tableNode("a"), tableNode("b"), tableNode("c")];
    const edges = [edge("a", "b"), edge("b", "c")];
    const laidOut = applyAlgorithmLayout(nodes, edges, {
      algorithm: "pipeline",
      rankdir: "LR",
      spacing: "default",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    });
    const byId = Object.fromEntries(laidOut.map((n) => [n.id, n.position]));
    expect(byId.a.x).toBeLessThan(byId.b.x);
    expect(byId.b.x).toBeLessThan(byId.c.x);
  });

  it("compact places nodes on a grid", () => {
    const nodes = Array.from({ length: 4 }, (_, i) => tableNode(`t${i}`));
    const laidOut = applyAlgorithmLayout(nodes, [], {
      algorithm: "compact",
      rankdir: "LR",
      spacing: "default",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    });
    const xs = new Set(laidOut.map((n) => n.position.x));
    expect(xs.size).toBeGreaterThan(1);
  });

  it("snowflake avoids overlapping tables on dense rings", () => {
    const nodes = [tableNode("hub", 8), ...Array.from({ length: 8 }, (_, i) => tableNode(`s${i}`, 6))];
    const edges = Array.from({ length: 8 }, (_, i) => edge("hub", `s${i}`));
    const laidOut = applyAlgorithmLayout(nodes, edges, {
      algorithm: "snowflake",
      rankdir: "LR",
      spacing: "compact",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    });
    expect(hasOverlaps(laidOut, 8)).toBe(false);
  });

  it("snowflake keeps the hub near the geometric center", () => {
    const nodes = [
      tableNode("hub"),
      tableNode("s1"),
      tableNode("s2"),
      tableNode("s3"),
    ];
    const edges = [edge("hub", "s1"), edge("hub", "s2"), edge("hub", "s3")];
    const laidOut = applyAlgorithmLayout(nodes, edges, {
      algorithm: "snowflake",
      rankdir: "LR",
      spacing: "default",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    });
    const hub = laidOut.find((n) => n.id === "hub")!;
    const others = laidOut.filter((n) => n.id !== "hub");
    for (const node of others) {
      const dx = node.position.x - hub.position.x;
      const dy = node.position.y - hub.position.y;
      expect(dx * dx + dy * dy).toBeGreaterThan(100);
    }
  });
});
