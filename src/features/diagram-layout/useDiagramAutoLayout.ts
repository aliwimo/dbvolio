import type { Edge, Node } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import {
  layoutFromNodes,
  saveDiagramLayout,
} from "../../services/layout-service";
import { useDiagramStore } from "../../stores/diagram-store";
import { useDiagramViewStore } from "../../stores/diagram-view-store";
import { useProjectStore } from "../../stores/project-store";
import { applyAutoLayoutAsync } from "./apply-auto-layout";
import type { LayoutScope } from "./layout-options";
import type { LayoutAlgorithm } from "../../stores/diagram-view-store";

export function useDiagramAutoLayout({
  nodes,
  edges,
  fitView,
}: {
  nodes: Node[];
  edges: Edge[];
  fitView: (options: { padding: number; duration: number }) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const generationRef = useRef(0);
  const runningRef = useRef(false);

  const projectRoot = useProjectStore((s) => s.projectRoot);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const setFlow = useDiagramStore((s) => s.setFlow);
  const selectedTableId = useDiagramStore((s) => s.selectedTableId);

  const runLayout = useCallback(
    (scope: LayoutScope = "all", algorithmOverride?: LayoutAlgorithm) => {
      if (runningRef.current || nodes.length === 0) {
        return;
      }
      if (scope === "selection" && !selectedTableId) {
        return;
      }

      const {
        layoutAlgorithm,
        layoutDirection,
        layoutSpacing,
        layoutFitView,
        layoutSeparateComponents,
      } = useDiagramViewStore.getState();
      const algorithm = algorithmOverride ?? layoutAlgorithm;

      const generation = ++generationRef.current;
      runningRef.current = true;
      setIsRunning(true);

      void applyAutoLayoutAsync(nodes, edges, {
        algorithm,
        rankdir: layoutDirection,
        spacing: layoutSpacing,
        scope,
        selectedNodeId: selectedTableId,
        separateComponents: layoutSeparateComponents,
      })
        .then((laidOut) => {
          if (generation !== generationRef.current) {
            return;
          }
          setFlow(laidOut, edges);
          if (projectRoot && entryPoint) {
            void saveDiagramLayout(
              entryPoint,
              layoutFromNodes(laidOut, undefined),
            );
          }
          if (layoutFitView) {
            const fitDuration = laidOut.length > 80 ? 0 : 280;
            requestAnimationFrame(() =>
              fitView({ padding: 0.15, duration: fitDuration }),
            );
          }
        })
        .finally(() => {
          if (generation === generationRef.current) {
            runningRef.current = false;
            setIsRunning(false);
          }
        });
    },
    [
      nodes,
      edges,
      selectedTableId,
      setFlow,
      projectRoot,
      entryPoint,
      fitView,
    ],
  );

  return {
    runLayout,
    isRunning,
    canRun: nodes.length > 0,
    canRunSelection: nodes.length > 0 && selectedTableId !== null,
  };
}
