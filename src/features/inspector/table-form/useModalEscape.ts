import { createEffect, onCleanup } from "solid-js";

export function useModalEscape(open: () => boolean, onClose: () => void): void {
  createEffect(() => {
    if (!open()) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });
}
