import { createSignal, createMemo, onCleanup, onMount, For, Show } from "solid-js";
import { COMMAND_DEFINITIONS } from "../../features/keymap/commands";
import {
  formatKeybinding,
  keybindingFromKeyboardEvent,
} from "../../features/keymap/default-keybindings";
import {
  findConflictingCommand,
  getEffectiveKeybinding,
} from "../../features/keymap/resolve-keybindings";
import { useKeymapStore } from "../../stores/keymap-store";
import { Button, Input } from "../ui";

export function KeyboardShortcutsSection() {
  const overrides = () => useKeymapStore((s) => s.overrides);
  const setOverride = useKeymapStore.getState().setOverride;
  const resetOverride = useKeymapStore.getState().resetOverride;
  const resetAllOverrides = useKeymapStore.getState().resetAllOverrides;
  const recordingCommandId = () => useKeymapStore((s) => s.recordingCommandId);
  const startRecording = useKeymapStore.getState().startRecording;
  const stopRecording = useKeymapStore.getState().stopRecording;

  const [query, setQuery] = createSignal("");
  const [conflictMessage, setConflictMessage] = createSignal<string | null>(null);

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return COMMAND_DEFINITIONS;
    return COMMAND_DEFINITIONS.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.id.toLowerCase().includes(q)
    );
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const recId = recordingCommandId();
    if (!recId) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      stopRecording();
      setConflictMessage(null);
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      setOverride(recId, null);
      stopRecording();
      setConflictMessage(null);
      return;
    }

    const binding = keybindingFromKeyboardEvent(event);
    if (!binding) return;

    const conflict = findConflictingCommand(binding, overrides(), recId);
    if (conflict) {
      setConflictMessage(
        `Already bound to “${COMMAND_DEFINITIONS.find((c) => c.id === conflict)?.title ?? conflict}”. Press Esc to cancel.`
      );
      return;
    }

    setOverride(recId, binding);
    stopRecording();
    setConflictMessage(null);
  };

  onMount(() => {
    window.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown, true));
  });

  return (
    <div class="settings-section">
      <div class="settings-header-row">
        <div>
          <h3 class="settings-section-title">Keyboard Shortcuts</h3>
          <p class="settings-section-hint">
            Click any shortcut to record a new key combination. Press Backspace to
            clear.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetAllOverrides}>
          Reset all
        </Button>
      </div>

      <div class="settings-shortcuts-search">
        <Input
          class="settings-input"
          placeholder="Filter shortcuts…"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
      </div>

      <Show when={conflictMessage()}>
        <div class="settings-shortcuts-conflict" role="alert">
          {conflictMessage()}
        </div>
      </Show>

      <div class="settings-shortcuts-list">
        <For each={filtered()}>
          {(cmd) => {
            const binding = () => getEffectiveKeybinding(cmd.id, overrides());
            const isRecording = () => recordingCommandId() === cmd.id;
            const hasOverride = () => cmd.id in overrides();

            return (
              <div class="settings-shortcut-row">
                <div class="settings-shortcut-info">
                  <span class="settings-shortcut-category">{cmd.category}</span>
                  <span class="settings-shortcut-title">{cmd.title}</span>
                </div>
                <div class="settings-shortcut-actions">
                  <button
                    type="button"
                    class={`btn btn-sm settings-shortcut-key ${isRecording() ? "recording" : ""}`}
                    onClick={() => {
                      if (isRecording()) {
                        stopRecording();
                        setConflictMessage(null);
                      } else {
                        startRecording(cmd.id);
                        setConflictMessage(null);
                      }
                    }}
                  >
                    <Show
                      when={!isRecording()}
                      fallback={<span>Press keys…</span>}
                    >
                      <Show
                        when={binding()}
                        fallback={<span class="settings-shortcut-unset">Unset</span>}
                      >
                        <kbd>{formatKeybinding(binding()!)}</kbd>
                      </Show>
                    </Show>
                  </button>
                  <Show when={hasOverride()}>
                    <button
                      type="button"
                      class="btn-icon btn-icon-xs"
                      title="Reset to default"
                      onClick={() => resetOverride(cmd.id)}
                    >
                      ×
                    </button>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
