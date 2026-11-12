import { type JSX } from "solid-js";

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
  const direction = () => props.direction ?? "horizontal";
  const minFirst = () => props.minFirst ?? 120;
  const minSecond = () => props.minSecond ?? 120;

  let ratio = props.initialRatio ?? 0.5;

  const onMouseDown = () => {
    const onMouseMove = (event: MouseEvent) => {
      if (!containerRef) return;
      const rect = containerRef.getBoundingClientRect();
      if (direction() === "horizontal") {
        const x = event.clientX - rect.left;
        ratio = Math.min(
          Math.max(x / rect.width, minFirst() / rect.width),
          1 - minSecond() / rect.width
        );
      } else {
        const y = event.clientY - rect.top;
        ratio = Math.min(
          Math.max(y / rect.height, minFirst() / rect.height),
          1 - minSecond() / rect.height
        );
      }
      const firstEl = containerRef.querySelector(".split-pane-first") as HTMLElement | null;
      const secondEl = containerRef.querySelector(".split-pane-second") as HTMLElement | null;
      if (firstEl && secondEl) {
        firstEl.style.flex = `${ratio} 1 0`;
        secondEl.style.flex = `${1 - ratio} 1 0`;
      }
    };

    const onMouseUp = () => {
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
      class={`split-pane split-${direction()}`}
    >
      <div class="split-pane-first" style={{ flex: `${ratio} 1 0` }}>
        {props.first}
      </div>
      <div
        class={`split-pane-resizer resizer-${direction()}`}
        role="separator"
        aria-orientation={isHorizontal() ? "vertical" : "horizontal"}
        onMouseDown={onMouseDown}
      />
      <div class="split-pane-second" style={{ flex: `${1 - ratio} 1 0` }}>
        {props.second}
      </div>
    </div>
  );
}
