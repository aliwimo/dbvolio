import { describe, expect, it } from "vitest";
import {
  getDiagramLayout,
  normalizeLayoutMetadata,
} from "../../src/services/layout-service";
import { LEGACY_LAYOUT_KEY } from "../../src/types/layout";

describe("layout-service", () => {
  it("migrates v1 layout into legacy bucket", () => {
    const meta = normalizeLayoutMetadata({
      version: 1,
      nodes: { "public.users": { x: 10, y: 20 } },
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    expect(meta.version).toBe(2);
    expect(meta.diagrams[LEGACY_LAYOUT_KEY]?.nodes["public.users"]).toEqual({
      x: 10,
      y: 20,
    });
  });

  it("keeps separate layouts per entry file", () => {
    const meta = normalizeLayoutMetadata({
      version: 2,
      diagrams: {
        "main.dbml": { nodes: { "public.a": { x: 1, y: 2 } } },
        "other.dbml": { nodes: { "public.b": { x: 3, y: 4 } } },
      },
    });
    expect(getDiagramLayout(meta, "main.dbml").nodes["public.a"]).toEqual({
      x: 1,
      y: 2,
    });
    expect(getDiagramLayout(meta, "other.dbml").nodes["public.b"]).toEqual({
      x: 3,
      y: 4,
    });
  });

  it("falls back to legacy layout for unknown entry keys", () => {
    const meta = normalizeLayoutMetadata({
      version: 2,
      diagrams: {
        [LEGACY_LAYOUT_KEY]: { nodes: { "public.users": { x: 5, y: 6 } } },
      },
    });
    expect(getDiagramLayout(meta, "main.dbml").nodes["public.users"]).toEqual({
      x: 5,
      y: 6,
    });
  });
});
