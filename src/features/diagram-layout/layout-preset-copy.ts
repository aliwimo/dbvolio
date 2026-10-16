import type { LayoutAlgorithm } from "../../stores/diagram-view-store";

export const LAYOUT_PRESET_COPY: Record<
  LayoutAlgorithm,
  { label: string; description: string }
> = {
  "left-right": {
    label: "Relationship flow",
    description:
      "Follow foreign keys across the canvas, with parents and children flowing in reading order.",
  },
  pipeline: {
    label: "Dependency lanes",
    description:
      "Sort tables into left-to-right lanes by how they depend on each other, stacked within each lane.",
  },
  snowflake: {
    label: "Hub & orbit",
    description:
      "Anchor the busiest tables in the middle and place neighbors on rings by graph distance.",
  },
  compact: {
    label: "Tile grid",
    description:
      "Snap tables into a dense grid—best when you want an overview and links are sparse.",
  },
};
