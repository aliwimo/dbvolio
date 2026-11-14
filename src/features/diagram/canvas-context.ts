import { createSignal } from "solid-js";

export interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasContextValue {
  transform: () => ViewportTransform;
  setTransform: (tf: ViewportTransform | ((prev: ViewportTransform) => ViewportTransform)) => void;
  zoomIn: (opts?: { duration?: number }) => void;
  zoomOut: (opts?: { duration?: number }) => void;
  fitView: (opts?: { padding?: number; duration?: number }) => void;
  setPendingFitView: () => void;
}

let activeCanvasContext: CanvasContextValue | null = null;

export function setCanvasContext(ctx: CanvasContextValue) {
  activeCanvasContext = ctx;
}

export function useCanvasContext(): CanvasContextValue {
  if (!activeCanvasContext) {
    const [tf, setTf] = createSignal<ViewportTransform>({ x: 0, y: 0, zoom: 1 });
    return {
      transform: tf,
      setTransform: setTf,
      zoomIn: () => {},
      zoomOut: () => {},
      fitView: () => {},
      setPendingFitView: () => {},
    };
  }
  return activeCanvasContext;
}
