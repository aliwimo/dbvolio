import { describe, expect, it } from "vitest";
import {
  computeDagreLayout,
} from "../../src/features/diagram-layout/dagre-layout-core";
import { uniqueLayoutEdges } from "../../src/features/diagram-layout/dagre-layout";
import type { Edge } from "@xyflow/react";

describe("dagre layout", () => {
  it("deduplicates parallel edges between the same tables", () => {
    const edges: Edge[] = [
      { id: "a", source: "t1", target: "t2" },
      { id: "b", source: "t1", target: "t2" },
      { id: "c", source: "t2", target: "t3" },
    ];
    expect(uniqueLayoutEdges(edges)).toEqual([
      { source: "t1", target: "t2" },
      { source: "t2", target: "t3" },
    ]);
  });

  it("assigns distinct positions for many nodes", () => {
    const count = 120;
    const nodes = Array.from({ length: count }, (_, i) => ({
      id: `table_${i}`,
      width: 260,
      height: 120,
    }));
    const edges = Array.from({ length: count - 1 }, (_, i) => ({
      source: `table_${i}`,
      target: `table_${i + 1}`,
    }));

    const positions = computeDagreLayout({
      nodes,
      edges,
      rankdir: "LR",
    });

    expect(Object.keys(positions)).toHaveLength(count);
    const xs = new Set(Object.values(positions).map((p) => p.x));
    expect(xs.size).toBeGreaterThan(1);
  });
});
