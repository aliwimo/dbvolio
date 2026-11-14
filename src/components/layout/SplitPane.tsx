import { createSignal, type JSX } from "solid-js";

interface SplitPaneProps {
  direction?: "horizontal" | "vertical";
  initialRatio?: number;
  minFirst?: number;
  minSecond?: number;
  first: JSX.Element;
  second: JSX.Element;
}

export function SplitPane(props: SplitPaneProps) {
  let containerRef: HTMLDivElement | undefined;
  const [ratio, setRatio] = createSignal(props.initialRatio ?? 0.5);
  const [dragging, setDragging] = createSignal(false);

  const direction = () => props.direction ?? "horizontal";
  const minFirst = () => props.minFirst ?? 120;
  const minSecond = () => props.minSecond ?? 120;

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setDragging(true);

    const onMouseMove = (event: MouseEvent) => {
      if (!containerRef) return;
      const rect = containerRef.getBoundingClientRect();
      if (direction() === "horizontal") {
        const x = event.clientX - rect.left;
        const next = Math.min(
          Math.max(x / rect.width, minFirst() / rect.width),
          1 - minSecond() / rect.width
        );
        setRatio(next);
      } else {
        const y = event.clientY - rect.top;
        const next = Math.min(
          Math.max(y / rect.height, minFirst() / rect.height),
          1 - minSecond() / rect.height
        );
        setRatio(next);
      }
    };

    const onMouseUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const isHorizontal = () => direction() === "horizontal";

  return (
    <div
      ref={containerRef}
      class={`split-pane ${isHorizontal() ? "split-pane-horizontal" : "split-pane-vertical"}`}
    >
      <div class="split-pane-pane" style={{ flex: `${ratio()} 1 0` }}>
        {props.first}
      </div>
      <div
        class={`split-pane-resizer ${dragging() ? "dragging" : ""}`}
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation={isHorizontal() ? "vertical" : "horizontal"}
      />
      <div class="split-pane-pane" style={{ flex: `${1 - ratio()} 1 0` }}>
        {props.second}
      </div>
    </div>
  );
}
