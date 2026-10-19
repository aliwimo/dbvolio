import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { normalizePendingOpens } from "./normalize-pending-opens";
import {
  takePendingDbmlOpens,
  type DbmlOpenPayload,
} from "../../services/tauri-bridge";
import { useProjectStore } from "../../stores/project-store";

async function openPayload(payload: DbmlOpenPayload): Promise<void> {
  const store = useProjectStore.getState();
  if (payload.relativePath) {
    await store.openProjectAtFile(payload.projectRoot, payload.relativePath);
  } else {
    await store.openProjectPath(payload.projectRoot);
  }
}

export function useExternalDbmlOpen(): void {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      const currentWindow = getCurrentWebviewWindow();
      unlisten = await currentWindow.listen<DbmlOpenPayload>("dbml-open", (event) => {
        void openPayload(event.payload).catch((err: unknown) => {
          console.error(err);
        });
      });

      const pending = normalizePendingOpens(await takePendingDbmlOpens());
      for (const payload of pending) {
        if (cancelled) {
          return;
        }
        try {
          await openPayload(payload);
        } catch (err) {
          console.error(err);
        }
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
