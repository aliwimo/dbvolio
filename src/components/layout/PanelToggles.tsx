import {
  Code2,
  Network,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { useUiStore, type PanelId } from "../../stores/ui-store";

const PANELS: { id: PanelId; label: string; icon: typeof PanelLeft }[] = [
  { id: "explorer", label: "Files", icon: PanelLeft },
  { id: "editor", label: "Editor", icon: Code2 },
  { id: "diagram", label: "Diagram", icon: Network },
  { id: "inspector", label: "Properties", icon: PanelRight },
];

export function PanelToggles() {
  const panels = useUiStore((s) => s.panels);
  const togglePanel = useUiStore((s) => s.togglePanel);

  return (
    <div className="panel-toggles panel-toggles-icons" role="group" aria-label="Panels">
      {PANELS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`panel-toggle ${panels[id] ? "active" : ""}`}
          onClick={() => togglePanel(id)}
          title={label}
          aria-pressed={panels[id]}
          aria-label={label}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
