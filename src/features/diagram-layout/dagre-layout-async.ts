import type { Edge, Node } from "@xyflow/react";
import {
  applyDagreLayout,
  applyDagreLayoutWithOptions,
  buildDagreLayoutInput,
  positionsToNodes,
} from "./dagre-layout";
import type { AutoLayoutOptions } from "./layout-options";
import type { LayoutDirection } from "../../stores/diagram-view-store";
import type { DagreLayoutPositions } from "./dagre-layout-core";
import type {
  DagreLayoutWorkerRequest,
  DagreLayoutWorkerResponse,
} from "./dagre-layout.worker";

let worker: Worker | null = null;
let nextJobId = 0;
const pendingJobs = new Map<
  number,
  {
    resolve: (positions: DagreLayoutPositions) => void;
    reject: (error: Error) => void;
  }
>();

function getLayoutWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./dagre-layout.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<DagreLayoutWorkerResponse>) => {
      const { jobId, positions } = event.data;
      const job = pendingJobs.get(jobId);
      if (!job) {
        return;
      }
      pendingJobs.delete(jobId);
      job.resolve(positions);
    };
    worker.onerror = (event) => {
      for (const job of pendingJobs.values()) {
        job.reject(new Error(event.message || "Layout worker failed"));
      }
      pendingJobs.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function runDagreLayoutInWorker(
  input: ReturnType<typeof buildDagreLayoutInput>,
): Promise<DagreLayoutPositions> {
  return new Promise((resolve, reject) => {
    const jobId = ++nextJobId;
    pendingJobs.set(jobId, { resolve, reject });
    const request: DagreLayoutWorkerRequest = { jobId, input };
    getLayoutWorker().postMessage(request);
  });
}

function resolveLayoutOptions(
  options: AutoLayoutOptions | LayoutDirection,
): AutoLayoutOptions {
  if (typeof options === "string") {
    return {
      rankdir: options,
      spacing: "default",
      scope: "all",
      selectedNodeId: null,
      separateComponents: false,
    };
  }
  return options;
}

/** Runs Dagre off the main thread when Web Workers are available. */
export async function applyDagreLayoutAsync(
  nodes: Node[],
  edges: Edge[] = [],
  options: AutoLayoutOptions | LayoutDirection = "LR",
): Promise<Node[]> {
  if (nodes.length === 0) {
    return nodes;
  }

  const resolved = resolveLayoutOptions(options);

  if (
    resolved.separateComponents ||
    resolved.scope === "selection" ||
    resolved.spacing !== "default"
  ) {
    return applyDagreLayoutWithOptions(nodes, edges, resolved);
  }

  const input = buildDagreLayoutInput(
    nodes,
    edges,
    resolved.rankdir,
    resolved.spacing,
  );

  try {
    if (typeof Worker !== "undefined") {
      const positions = await runDagreLayoutInWorker(input);
      return positionsToNodes(nodes, positions);
    }
  } catch {
    // Fall back to synchronous layout (e.g. worker load failure).
  }

  return applyDagreLayout(nodes, edges, resolved.rankdir, resolved.spacing);
}
