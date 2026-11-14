import { createEffect, onCleanup } from "solid-js";
import { useKeymapStore } from "../../stores/keymap-store";
import { useQuickPickStore } from "../../stores/quick-pick-store";
import { executeCommand } from "./execute-command";
import { findCommandForKeyboardEvent } from "./resolve-keybindings";

function shouldIgnoreGlobalKeymap(event: KeyboardEvent): boolean {
  if (useKeymapStore.getState().recordingCommandId) {
    return true;
  }

  if (useQuickPickStore.getState().kind) {
    return true;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  const isTextField =
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable;

  const mod = event.metaKey || event.ctrlKey;
  if (isTextField && !mod) {
    return true;
  }

  return false;
}

export function useAppKeymap() {
  createEffect(() => {
    const overrides = useKeymapStore((s) => s.overrides);

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreGlobalKeymap(event)) {
        return;
      }

      const commandId = findCommandForKeyboardEvent(event, overrides);
      if (!commandId) {
        return;
      }

      event.preventDefault();
      executeCommand(commandId);
    };

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });
}
