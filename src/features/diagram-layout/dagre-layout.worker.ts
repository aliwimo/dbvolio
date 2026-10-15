import {
  computeDagreLayout,
  type DagreLayoutInput,
} from "./dagre-layout-core";

export type DagreLayoutWorkerRequest = {
  jobId: number;
  input: DagreLayoutInput;
};

export type DagreLayoutWorkerResponse = {
  jobId: number;
  positions: ReturnType<typeof computeDagreLayout>;
};

self.onmessage = (event: MessageEvent<DagreLayoutWorkerRequest>) => {
  const { jobId, input } = event.data;
  const positions = computeDagreLayout(input);
  const response: DagreLayoutWorkerResponse = { jobId, positions };
  self.postMessage(response);
};
