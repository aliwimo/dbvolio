import { useEffect } from "react";
import { useKeymapStore } from "../../stores/keymap-store";
import { useUiStore } from "../../stores/ui-store";
import { executeCommand } from "./execute-command";
import { findCommandForKeyboardEvent } from "./resolve-keybindings";

function shouldIgnoreGlobalKeymap(event: KeyboardEvent): boolean {
  if (useKeymapStore.getState().recordingCommandId) {
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
  const overrides = useKeymapStore((s) => s.overrides);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreGlobalKeymap(event)) {
        return;
      }

      const commandId = findCommandForKeyboardEvent(event, overrides);
      if (!commandId) {
        return;
      }

      if (commandId === "settings.open" && useUiStore.getState().settingsOpen) {
        useUiStore.getState().closeSettings();
        event.preventDefault();
        return;
      }

      event.preventDefault();
      executeCommand(commandId);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overrides]);
}
