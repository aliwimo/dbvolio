import { For } from "solid-js";
import { PRESET_HEADER_COLORS } from "./constants";

function isPresetColor(value: string): boolean {
  return (PRESET_HEADER_COLORS as readonly string[]).includes(value);
}

export function HeaderColorPicker(props: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <div class="table-form-color-picker" role="group" aria-label="Header color">
      <button
        type="button"
        class={`table-form-color-swatch table-form-color-none ${!props.value ? "active" : ""}`}
        title="Default (no custom color)"
        disabled={props.disabled}
        onClick={() => props.onChange("")}
      >
        <span class="table-form-color-none-icon" aria-hidden>
          ∅
        </span>
      </button>

      <For each={PRESET_HEADER_COLORS}>
        {(color) => (
          <button
            type="button"
            class={`table-form-color-swatch ${props.value === color ? "active" : ""}`}
            style={{ background: color }}
            title={color}
            disabled={props.disabled}
            onClick={() => props.onChange(color)}
          />
        )}
      </For>

      <label
        class={`table-form-color-swatch table-form-color-custom ${props.value && !isPresetColor(props.value) ? "active" : ""}`}
        title="Pick custom color"
      >
        <span
          class="table-form-color-custom-preview"
          style={{ background: props.value || "#6366f1" }}
          aria-hidden
        />
        <input
          type="color"
          class="table-form-color-custom-input"
          value={props.value || "#6366f1"}
          disabled={props.disabled}
          onChange={(e) => props.onChange(e.currentTarget.value)}
        />
      </label>
    </div>
  );
}
