import {
  Code2,
  Network,
  PanelLeft,
  PanelRight,
} from "lucide-solid";
import { For } from "solid-js";
import { panelToggleTitle } from "../../features/keymap/panel-toggle-commands";
import { useKeymapStore } from "../../stores/keymap-store";
import { useUiStore, type PanelId } from "../../stores/ui-store";
import { Button } from "../ui";

const PANELS: { id: PanelId; label: string; icon: typeof PanelLeft }[] = [
  { id: "explorer", label: "Files", icon: PanelLeft },
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "diagram", label: "Diagram", icon: Network },
  { id: "inspector", label: "Properties", icon: PanelRight },
];

export function PanelToggles() {
  const overrides = () => useKeymapStore((s) => s.overrides);
  const panels = () => useUiStore((s) => s.panels);
  const togglePanel = useUiStore.getState().togglePanel;

  return (
    <div class="panel-toggles panel-toggles-icons" role="group" aria-label="Panels">
      <For each={PANELS}>
        {({ id, label, icon: Icon }) => {
          const tip = () => panelToggleTitle(label, id, overrides());
          const isActive = () => panels()[id];
          return (
            <Button
              variant="ghost"
              size="icon"
              class={`panel-toggle ${isActive() ? "active" : ""}`}
              onClick={() => togglePanel(id)}
              title={tip()}
              aria-pressed={isActive()}
              aria-label={tip()}
            >
              <Icon size={15} strokeWidth={2} />
            </Button>
          );
        }}
      </For>
    </div>
  );
}
