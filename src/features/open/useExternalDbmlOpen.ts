import { listen } from "@tauri-apps/api/event";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import {
  takePendingDbmlOpens,
  type DbmlOpenPayload,
} from "../../services/tauri-bridge";
import { useProjectStore } from "../../stores/project-store";

async function openPayload(payload: DbmlOpenPayload): Promise<void> {
  await useProjectStore
    .getState()
    .openProjectAtFile(payload.projectRoot, payload.relativePath);
}

export function useExternalDbmlOpen(): void {
  const openProjectAtFile = useProjectStore((s) => s.openProjectAtFile);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      unlisten = await listen<DbmlOpenPayload>("dbml-open", (event) => {
        void openProjectAtFile(
          event.payload.projectRoot,
          event.payload.relativePath,
        ).catch((err: unknown) => {
          console.error(err);
        });
      });

      const pending = await takePendingDbmlOpens();
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
  }, [openProjectAtFile]);
}
