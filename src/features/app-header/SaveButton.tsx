import { Save } from "lucide-solid";
import { useEditorStore } from "../editor/editor-store";
import { useCommandKeybindingLabel } from "../keymap/format-command-keybinding";
import { Button } from "../../shared/ui";

export function SaveButton() {
  const saveActive = useEditorStore.getState().saveActive;
  const activePath = () => useEditorStore((s) => s.activePath);
  const activeTab = () =>
    useEditorStore((s) => s.tabs.find((t) => t.relativePath === s.activePath));
  const saveShortcut = () => useCommandKeybindingLabel("file.save");

  const isDirty = () => Boolean(activeTab()?.isDirty);

  return (
    <Button
      variant="ghost"
      size="icon"
      class="border-transparent text-(--text)"
      disabled={!activePath() || !isDirty()}
      aria-label="Save file"
      title={saveShortcut() ? `Save file (${saveShortcut()})` : "Save file"}
      onClick={() => void saveActive()}
    >
      <Save size={15} />
    </Button>
  );
}
