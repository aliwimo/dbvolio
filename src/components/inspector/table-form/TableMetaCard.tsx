import { FileCode2 } from "lucide-solid";
import { For, Show, type JSX } from "solid-js";
import { HeaderColorPicker } from "./HeaderColorPicker";

export function TableMetaCard(props: {
  schema: string;
  name: string;
  onSchemaChange: (value: string) => void;
  onNameChange: (value: string) => void;
  headerColor: string;
  onHeaderColorChange: (color: string) => void;
  targetFile?: string;
  onTargetFileChange?: (path: string) => void;
  dbmlFilePaths?: string[];
  disabled?: boolean;
  actions?: JSX.Element;
  nameAutoFocus?: boolean;
}) {
  return (
    <section class="table-form-meta-card">
      <div class="table-form-meta-fields">
        <label class="table-form-field table-form-field-schema">
          Schema
          <input
            value={props.schema}
            onInput={(e) => props.onSchemaChange(e.currentTarget.value)}
            placeholder="public"
            disabled={props.disabled}
          />
        </label>
        <label class="table-form-field table-form-field-name">
          Table name
          <input
            value={props.name}
            autofocus={props.nameAutoFocus}
            onInput={(e) => props.onNameChange(e.currentTarget.value)}
            placeholder="users"
            disabled={props.disabled}
          />
        </label>
        <HeaderColorPicker
          value={props.headerColor}
          onChange={props.onHeaderColorChange}
          disabled={props.disabled}
        />
      </div>

      <Show when={props.dbmlFilePaths && props.dbmlFilePaths.length > 0 && props.onTargetFileChange}>
        <div class="table-form-target-file">
          <label class="table-form-target-file-label" for="table-form-target-file-select">
            <FileCode2 size={13} aria-hidden />
            <span>Target file</span>
          </label>
          <select
            id="table-form-target-file-select"
            class="select-compact table-form-target-file-select"
            value={props.targetFile ?? props.dbmlFilePaths![0]}
            onChange={(e) => props.onTargetFileChange!(e.currentTarget.value)}
            disabled={props.disabled}
          >
            <For each={props.dbmlFilePaths}>
              {(p) => (
                <option value={p} title={p}>
                  {p}
                </option>
              )}
            </For>
          </select>
        </div>
      </Show>

      <Show when={props.actions}>
        <div class="table-form-meta-actions">{props.actions}</div>
      </Show>
    </section>
  );
}
