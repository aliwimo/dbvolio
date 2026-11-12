import type { Edge, Node } from "../../types/flow";
import { createSignal } from "solid-js";
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

export function useDiagramAutoLayout(params: {
  nodes: () => Node[];
  edges: () => Edge[];
  fitView: (options?: { padding?: number; duration?: number }) => void;
}) {
  const [isRunning, setIsRunning] = createSignal(false);
  let generation = 0;
  let running = false;

  const runLayout = async (
    scope: LayoutScope = "all",
    algorithmOverride?: LayoutAlgorithm
  ) => {
    const currentNodes = params.nodes();
    const currentEdges = params.edges();

    if (running || currentNodes.length === 0) {
      return;
    }
    const selectedTableId = useDiagramStore.getState().selectedTableId;
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

    const currentGen = ++generation;
    running = true;
    setIsRunning(true);

    try {
      const nextNodes = await applyAutoLayoutAsync(currentNodes, currentEdges, {
        direction: layoutDirection,
        algorithm,
        spacing: layoutSpacing,
        scope,
        selectedTableId: selectedTableId ?? undefined,
        separateComponents: layoutSeparateComponents,
      });

      if (currentGen !== generation) {
        return;
      }

      useDiagramStore.getState().setFlow(nextNodes, currentEdges);

      const entryPoint = useProjectStore.getState().entryPoint;
      if (entryPoint) {
        saveDiagramLayout(entryPoint, layoutFromNodes(nextNodes));
      }

      if (layoutFitView) {
        requestAnimationFrame(() => {
          params.fitView({ padding: 0.15, duration: 280 });
        });
      }
    } finally {
      if (currentGen === generation) {
        running = false;
        setIsRunning(false);
      }
    }
  };

  const canRun = () => params.nodes().length > 0;
  const canRunSelection = () =>
    Boolean(useDiagramStore((s) => s.selectedTableId)) &&
    params.nodes().length > 0;

  return {
    runLayout,
    get isRunning() {
      return isRunning();
    },
    get canRun() {
      return canRun();
    },
    get canRunSelection() {
      return canRunSelection();
    },
  };
}
