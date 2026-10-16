import { listen } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { executeCommand } from "./execute-command";
import type { CommandId } from "./types";

const MENU_COMMANDS = new Set<CommandId>([
  "project.open",
  "project.openFile",
  "project.close",
  "file.save",
  "file.closeEditor",
  "settings.open",
]);

export function useNativeAppMenu(): void {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let unlisten: (() => void) | undefined;

    void listen<string>("app-command", (event) => {
      const commandId = event.payload;
      if (MENU_COMMANDS.has(commandId as CommandId)) {
        executeCommand(commandId as CommandId);
      }
    }).then((off) => {
      unlisten = off;
    });

    return () => {
      unlisten?.();
    };
  }, []);
}
