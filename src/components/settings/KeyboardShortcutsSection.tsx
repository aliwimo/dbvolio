import { useEffect, useMemo, useState } from "react";
import { COMMAND_DEFINITIONS } from "../../features/keymap/commands";
import {
  formatKeybinding,
  keybindingFromKeyboardEvent,
} from "../../features/keymap/default-keybindings";
import {
  findConflictingCommand,
  getEffectiveKeybinding,
} from "../../features/keymap/resolve-keybindings";
import type { CommandId } from "../../features/keymap/types";
import { useKeymapStore } from "../../stores/keymap-store";

export function KeyboardShortcutsSection() {
  const overrides = useKeymapStore((s) => s.overrides);
  const setOverride = useKeymapStore((s) => s.setOverride);
  const resetOverride = useKeymapStore((s) => s.resetOverride);
  const resetAllOverrides = useKeymapStore((s) => s.resetAllOverrides);
  const recordingCommandId = useKeymapStore((s) => s.recordingCommandId);
  const startRecording = useKeymapStore((s) => s.startRecording);
  const stopRecording = useKeymapStore((s) => s.stopRecording);

  const [query, setQuery] = useState("");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return COMMAND_DEFINITIONS;
    }
    return COMMAND_DEFINITIONS.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.id.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!recordingCommandId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        stopRecording();
        setConflictMessage(null);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        setOverride(recordingCommandId, null);
        stopRecording();
        setConflictMessage(null);
        return;
      }

      const binding = keybindingFromKeyboardEvent(event);
      if (!binding) {
        return;
      }

      const conflict = findConflictingCommand(
        binding,
        overrides,
        recordingCommandId,
      );
      if (conflict) {
        setConflictMessage(
          `Already bound to “${COMMAND_DEFINITIONS.find((c) => c.id === conflict)?.title ?? conflict}”. Press Esc to cancel.`,
        );
        return;
      }

      setOverride(recordingCommandId, binding);
      stopRecording();
      setConflictMessage(null);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recordingCommandId, overrides, setOverride, stopRecording]);

  return (
    <section className="settings-block settings-block-keymap">
      <h3 className="settings-block-title">Keyboard shortcuts</h3>
      <p className="settings-section-desc">
        Defaults follow common VS Code bindings. Click a keybinding to change it;
        Backspace clears, Esc cancels while recording.
      </p>
      <div className="settings-keymap-toolbar">
        <input
          type="search"
          className="settings-keymap-search"
          placeholder="Search keybindings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search keybindings"
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            resetAllOverrides();
            setConflictMessage(null);
          }}
        >
          Reset all
        </button>
      </div>

      {recordingCommandId && (
        <p className="settings-keymap-recording" role="status">
          Recording shortcut for{" "}
          <strong>
            {COMMAND_DEFINITIONS.find((c) => c.id === recordingCommandId)
              ?.title ?? recordingCommandId}
          </strong>
          . Press keys, Backspace to clear, Esc to cancel.
        </p>
      )}
      {conflictMessage && (
        <p className="settings-keymap-conflict" role="alert">
          {conflictMessage}
        </p>
      )}

      <div className="settings-keymap-table-wrap">
        <table className="settings-keymap-table">
          <thead>
            <tr>
              <th scope="col">Command</th>
              <th scope="col">Keybinding</th>
              <th scope="col" className="settings-keymap-actions-col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cmd) => (
              <KeymapRow
                key={cmd.id}
                commandId={cmd.id}
                title={cmd.title}
                category={cmd.category}
                overrides={overrides}
                isRecording={recordingCommandId === cmd.id}
                onRecord={() => {
                  setConflictMessage(null);
                  startRecording(cmd.id);
                }}
                onReset={() => resetOverride(cmd.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KeymapRow({
  commandId,
  title,
  category,
  overrides,
  isRecording,
  onRecord,
  onReset,
}: {
  commandId: CommandId;
  title: string;
  category: string;
  overrides: ReturnType<typeof useKeymapStore.getState>["overrides"];
  isRecording: boolean;
  onRecord: () => void;
  onReset: () => void;
}) {
  const binding = getEffectiveKeybinding(commandId, overrides);
  const hasOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    commandId,
  );

  const label = binding ? formatKeybinding(binding) : "—";

  return (
    <tr className={isRecording ? "settings-keymap-row-recording" : undefined}>
      <td>
        <span className="settings-keymap-command">{title}</span>
        <span className="settings-keymap-category">{category}</span>
      </td>
      <td>
        <button
          type="button"
          className={`settings-keymap-key ${isRecording ? "recording" : ""}`}
          onClick={onRecord}
          aria-pressed={isRecording}
        >
          {isRecording ? "Press keys…" : label}
        </button>
      </td>
      <td className="settings-keymap-actions-col">
        {hasOverride && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onReset}
          >
            Reset
          </button>
        )}
      </td>
    </tr>
  );
}
