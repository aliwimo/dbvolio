import { FileCode2 } from "lucide-solid";
import { For, Show, type JSX } from "solid-js";
import { formatQualifiedTableName } from "./column-helpers";
import { HeaderColorPicker } from "./HeaderColorPicker";
import { Input } from "../../../shared/ui";

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
  const qualified = () => formatQualifiedTableName(props.schema, props.name);

  return (
    <section class="table-form-meta-card">
      <div class="table-form-meta-fields">
        <label class="table-form-field table-form-field-schema">
          Schema
          <Input
            value={props.schema}
            onInput={(e) => props.onSchemaChange(e.currentTarget.value)}
            placeholder="public"
            disabled={props.disabled}
          />
        </label>
        <label class="table-form-field table-form-field-name">
          Table name
          <Input
            value={props.name}
            onInput={(e) => props.onNameChange(e.currentTarget.value)}
            placeholder="orders, user_profiles…"
            autofocus={props.nameAutoFocus}
            disabled={props.disabled}
          />
        </label>
      </div>

      <p class="table-form-meta-qualified" title="Qualified table name">
        <span class="table-form-meta-qualified-label">Full name</span>
        <code>{qualified()}</code>
      </p>

      <Show
        when={
          props.dbmlFilePaths &&
          props.dbmlFilePaths.length > 0 &&
          props.onTargetFileChange
        }
      >
        <label class="table-form-field table-form-field-file">
          <span class="table-form-field-file-label">
            <FileCode2 size={13} aria-hidden />
            Save to DBML file
          </span>
          <select
            value={props.targetFile}
            onChange={(e) => props.onTargetFileChange!(e.currentTarget.value)}
            disabled={props.disabled}
          >
            <For each={props.dbmlFilePaths}>
              {(path) => <option value={path}>{path}</option>}
            </For>
          </select>
        </label>
      </Show>

      <div class="table-form-meta-divider" role="presentation" />

      <div class="table-form-meta-color">
        <span class="table-form-meta-sublabel">Diagram header color</span>
        <HeaderColorPicker
          value={props.headerColor}
          onChange={props.onHeaderColorChange}
          disabled={props.disabled}
        />
      </div>

      <Show when={props.actions}>
        <footer class="table-form-meta-footer">{props.actions}</footer>
      </Show>
    </section>
  );
}
