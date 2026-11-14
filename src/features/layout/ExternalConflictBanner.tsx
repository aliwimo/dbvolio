import { Show } from "solid-js";
import { useEditorStore } from "../../features/editor/editor-store";
import { Button } from "../../shared/ui";

export function ExternalConflictBanner() {
  const externalConflict = () => useEditorStore((s) => s.externalConflict);
  const reloadFromDisk = useEditorStore.getState().reloadFromDisk;
  const saveFile = useEditorStore.getState().saveFile;

  return (
    <Show when={externalConflict()}>
      {(conflict) => (
        <div class="conflict-banner">
          <span>
            {conflict()} changed on disk while you were editing.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void reloadFromDisk(conflict())}
          >
            Reload from disk
          </Button>
          <Button size="sm" onClick={() => void saveFile(conflict())}>
            Overwrite disk
          </Button>
        </div>
      )}
    </Show>
  );
}
