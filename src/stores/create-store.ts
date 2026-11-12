import { createSignal, createRoot } from "solid-js";

export type StateCreator<T> = (
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  get: () => T
) => T;

export interface StoreApi<T> {
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: (state: T, prevState: T) => void) => () => void;
}

export interface UseBoundStore<T> extends StoreApi<T> {
  (): T;
  <U>(selector: (state: T) => U): U;
}

export function createStoreFactory<T extends object>(
  initializer: StateCreator<T>
): UseBoundStore<T> {
  return createRoot(() => {
    const listeners = new Set<(state: T, prevState: T) => void>();

    let rawState: T;
    const [signal, setSignal] = createSignal<T>(undefined as unknown as T, {
      equals: false,
    });

    const getState = () => rawState;

    const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
      const prev = rawState;
      const nextPartial =
        typeof partial === "function"
          ? (partial as (state: T) => Partial<T>)(rawState)
          : partial;

      rawState = Object.assign({}, rawState, nextPartial);
      setSignal(() => rawState);

      for (const listener of listeners) {
        listener(rawState, prev);
      }
    };

    rawState = initializer(setState, getState);
    setSignal(() => rawState);

    const subscribe = (listener: (state: T, prevState: T) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    };

    function useStore(): T;
    function useStore<U>(selector: (state: T) => U): U;
    function useStore<U>(selector?: (state: T) => U): T | U {
      const state = signal();
      return selector ? selector(state) : state;
    }

    useStore.getState = getState;
    useStore.setState = setState;
    useStore.subscribe = subscribe;

    return useStore as UseBoundStore<T>;
  });
}
