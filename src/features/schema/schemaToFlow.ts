import type { Edge, Node } from "@xyflow/react";
import type { SchemaModel } from "../../types/schema";
import type { TableNodeData } from "../../components/diagram/TableNode";
import { sourceHandleId, targetHandleId } from "./column-handles";

export function schemaToFlow(model: SchemaModel): {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
} {
  const fkColumns = new Map<string, Set<string>>();
  const refSourceColumns = new Map<string, Set<string>>();
  const refTargetColumns = new Map<string, Set<string>>();

  for (const ref of model.references) {
    const fkSet = fkColumns.get(ref.sourceTableId) ?? new Set<string>();
    for (const col of ref.sourceColumns) {
      fkSet.add(col);
    }
    fkColumns.set(ref.sourceTableId, fkSet);

    const srcSet = refSourceColumns.get(ref.sourceTableId) ?? new Set<string>();
    for (const col of ref.sourceColumns) {
      srcSet.add(col);
    }
    refSourceColumns.set(ref.sourceTableId, srcSet);

    const tgtSet = refTargetColumns.get(ref.targetTableId) ?? new Set<string>();
    for (const col of ref.targetColumns) {
      tgtSet.add(col);
    }
    refTargetColumns.set(ref.targetTableId, tgtSet);
  }

  const nodes: Node<TableNodeData>[] = model.tables.map((table) => ({
    id: table.id,
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: {
      table,
      foreignKeys: fkColumns.get(table.id) ?? new Set<string>(),
      refSourceColumns: refSourceColumns.get(table.id) ?? new Set<string>(),
      refTargetColumns: refTargetColumns.get(table.id) ?? new Set<string>(),
      headerColor: table.headerColor,
    },
  }));

  const edges: Edge[] = [];
  for (const ref of model.references) {
    const pairCount = Math.max(
      ref.sourceColumns.length,
      ref.targetColumns.length,
      1,
    );
    for (let i = 0; i < pairCount; i += 1) {
      const sourceCol =
        ref.sourceColumns[i] ?? ref.sourceColumns[0] ?? "";
      const targetCol =
        ref.targetColumns[i] ?? ref.targetColumns[0] ?? "";
      if (!sourceCol || !targetCol) {
        continue;
      }
      edges.push({
        id: pairCount > 1 ? `${ref.id}:${i}` : ref.id,
        type: "relationshipEdge",
        source: ref.sourceTableId,
        target: ref.targetTableId,
        sourceHandle: sourceHandleId(sourceCol),
        targetHandle: targetHandleId(targetCol),
        data: {
          sourceColumns: [sourceCol],
          targetColumns: [targetCol],
        },
      });
    }
  }

  return { nodes, edges };
}
