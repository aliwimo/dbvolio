import { createSignal, type JSX } from "solid-js";

interface ResizableRailProps {
  side: "left" | "right";
  width: number;
  defaultWidth: number;
  onResize: (width: number) => void;
  ariaLabel: string;
  children: JSX.Element;
}

export function ResizableRail(props: ResizableRailProps) {
  let railRef: HTMLElement | undefined;
  const [resizing, setResizing] = createSignal(false);

  const onResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const onMouseMove = (event: MouseEvent) => {
      if (!railRef) return;
      const rect = railRef.getBoundingClientRect();
      const nextWidth =
        props.side === "left"
          ? event.clientX - rect.left
          : rect.right - event.clientX;
      props.onResize(nextWidth);
    };
    const onMouseUp = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const resizer = (
    <div
      class={`workspace-rail-resizer ${props.side === "left" ? "workspace-rail-resizer-trailing" : ""} ${resizing() ? "dragging" : ""}`}
      onMouseDown={onResizeStart}
      onDblClick={() => props.onResize(props.defaultWidth)}
      role="separator"
      aria-orientation="vertical"
      aria-label={props.ariaLabel}
      title="Drag to resize · Double-click to reset"
    />
  );

  return (
    <aside
      ref={railRef}
      class={`workspace-rail workspace-rail-${props.side}`}
      style={{ width: `${props.width}px` }}
    >
      {props.side === "left" ? (
        <>
          {props.children}
          {resizer}
        </>
      ) : (
        <>
          {resizer}
          {props.children}
        </>
      )}
    </aside>
  );
}
