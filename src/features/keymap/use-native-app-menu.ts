import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
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
    const currentWindow = getCurrentWebviewWindow();

    void listen<string>("app-command", async (event) => {
      // Only execute menu command in the focused window
      const isFocused = await currentWindow.isFocused().catch(() => false);
      if (!isFocused) {
        return;
      }
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
