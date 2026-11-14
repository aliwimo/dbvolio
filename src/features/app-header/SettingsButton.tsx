import { Settings } from "lucide-solid";
import { useCommandKeybindingLabel } from "../keymap/format-command-keybinding";
import { useUiStore } from "../../shared/stores/ui-store";
import { Button } from "../../shared/ui";

export function SettingsButton() {
  const openSettings = useUiStore.getState().openSettings;
  const settingsShortcut = () => useCommandKeybindingLabel("settings.open");

  return (
    <Button
      variant="ghost"
      size="icon"
      title={
        settingsShortcut() ? `Settings (${settingsShortcut()})` : "Settings"
      }
      aria-label="Settings"
      onClick={openSettings}
    >
      <Settings size={15} />
    </Button>
  );
}
