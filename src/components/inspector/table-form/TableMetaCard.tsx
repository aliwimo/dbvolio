import { FileCode2 } from "lucide-react";
import type { ReactNode } from "react";
import { formatQualifiedTableName } from "./column-helpers";
import { HeaderColorPicker } from "./HeaderColorPicker";

export function TableMetaCard({
  schema,
  name,
  onSchemaChange,
  onNameChange,
  headerColor,
  onHeaderColorChange,
  targetFile,
  onTargetFileChange,
  dbmlFilePaths,
  disabled,
  actions,
  nameAutoFocus,
}: {
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
  actions?: ReactNode;
  nameAutoFocus?: boolean;
}) {
  const qualified = formatQualifiedTableName(schema, name);

  return (
    <section className="table-form-meta-card">
      <div className="table-form-meta-fields">
        <label className="table-form-field table-form-field-schema">
          Schema
          <input
            value={schema}
            onChange={(e) => onSchemaChange(e.target.value)}
            placeholder="public"
            disabled={disabled}
          />
        </label>
        <label className="table-form-field table-form-field-name">
          Table name
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="orders, user_profiles…"
            autoFocus={nameAutoFocus}
            disabled={disabled}
          />
        </label>
      </div>

      <p className="table-form-meta-qualified" title="Qualified table name">
        <span className="table-form-meta-qualified-label">Full name</span>
        <code>{qualified}</code>
      </p>

      {dbmlFilePaths && dbmlFilePaths.length > 0 && onTargetFileChange && (
        <label className="table-form-field table-form-field-file">
          <span className="table-form-field-file-label">
            <FileCode2 size={13} aria-hidden />
            Save to DBML file
          </span>
          <select
            value={targetFile}
            onChange={(e) => onTargetFileChange(e.target.value)}
            disabled={disabled}
          >
            {dbmlFilePaths.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="table-form-meta-divider" role="presentation" />

      <div className="table-form-meta-color">
        <span className="table-form-meta-sublabel">Diagram header color</span>
        <HeaderColorPicker
          value={headerColor}
          onChange={onHeaderColorChange}
          disabled={disabled}
        />
      </div>

      {actions && <footer className="table-form-meta-footer">{actions}</footer>}
    </section>
  );
}
