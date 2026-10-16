import { PRESET_HEADER_COLORS } from "./constants";

function isPresetColor(value: string): boolean {
  return (PRESET_HEADER_COLORS as readonly string[]).includes(value);
}

export function HeaderColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="table-form-color-picker" role="group" aria-label="Header color">
      <button
        type="button"
        className={`table-form-color-swatch table-form-color-none ${!value ? "active" : ""}`}
        title="Default (no custom color)"
        disabled={disabled}
        onClick={() => onChange("")}
      >
        <span className="table-form-color-none-icon" aria-hidden>
          ∅
        </span>
      </button>

      {PRESET_HEADER_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`table-form-color-swatch ${value === color ? "active" : ""}`}
          style={{ background: color }}
          title={color}
          disabled={disabled}
          onClick={() => onChange(color)}
        />
      ))}

      <label
        className={`table-form-color-swatch table-form-color-custom ${value && !isPresetColor(value) ? "active" : ""}`}
        title="Pick custom color"
      >
        <span
          className="table-form-color-custom-preview"
          style={{ background: value || "#6366f1" }}
          aria-hidden
        />
        <input
          type="color"
          className="table-form-color-native"
          value={value || "#6366f1"}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
