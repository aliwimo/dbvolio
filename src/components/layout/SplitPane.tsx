import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface SplitPaneProps {
  direction?: "horizontal" | "vertical";
  initialRatio?: number;
  minFirst?: number;
  minSecond?: number;
  first: ReactNode;
  second: ReactNode;
}

export function SplitPane({
  direction = "horizontal",
  initialRatio = 0.5,
  minFirst = 120,
  minSecond = 120,
  first,
  second,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const [dragging, setDragging] = useState(false);

  const onMouseDown = useCallback(() => {
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) {
      return;
    }
    const onMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      if (direction === "horizontal") {
        const x = event.clientX - rect.left;
        const next = Math.min(
          Math.max(x / rect.width, minFirst / rect.width),
          1 - minSecond / rect.width,
        );
        setRatio(next);
      } else {
        const y = event.clientY - rect.top;
        const next = Math.min(
          Math.max(y / rect.height, minFirst / rect.height),
          1 - minSecond / rect.height,
        );
        setRatio(next);
      }
    };
    const onMouseUp = () => setDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [direction, dragging, minFirst, minSecond]);

  const isHorizontal = direction === "horizontal";
  const firstStyle = { flex: `${ratio} 1 0` };
  const secondStyle = { flex: `${1 - ratio} 1 0` };

  return (
    <div
      ref={containerRef}
      className={`split-pane ${isHorizontal ? "" : "split-pane-vertical"}`}
    >
      <div className="split-pane-pane" style={firstStyle}>
        {first}
      </div>
      <div
        className={`split-pane-resizer ${dragging ? "dragging" : ""}`}
        onMouseDown={onMouseDown}
        role="separator"
        aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      />
      <div className="split-pane-pane" style={secondStyle}>
        {second}
      </div>
    </div>
  );
}
