import { describe, expect, it } from "vitest";
import type { Edge } from "@xyflow/react";
import {
  componentForNode,
  connectedComponents,
} from "../../src/features/diagram-layout/layout-graph";

describe("layout graph", () => {
  it("splits disconnected table groups", () => {
    const edges: Edge[] = [
      { id: "1", source: "a", target: "b" },
      { id: "2", source: "c", target: "d" },
    ];
    expect(connectedComponents(["a", "b", "c", "d"], edges)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns the component for a selected node", () => {
    const edges: Edge[] = [{ id: "1", source: "a", target: "b" }];
    expect(componentForNode("b", ["a", "b", "c"], edges)).toEqual(["a", "b"]);
  });
});
