import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { applyCreateTable } from "../../features/schema/apply-schema-edits";
import { useDiagramStore } from "../../stores/diagram-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import type { SchemaColumn } from "../../types/schema";

const PG_TYPES = [
  "int",
  "bigint",
  "serial",
  "bigserial",
  "varchar",
  "text",
  "uuid",
  "boolean",
  "timestamptz",
  "timestamp",
  "date",
  "jsonb",
  "json",
  "numeric",
  "float",
  "double precision",
];

const PRESET_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

function defaultIdColumn(): SchemaColumn {
  return {
    name: "id",
    type: "serial",
    isPrimaryKey: true,
    isNullable: false,
    isUnique: false,
  };
}

export function TableCreateModal() {
  const open = useUiStore((s) => s.tableCreateOpen);
  const closeTableCreate = useUiStore((s) => s.closeTableCreate);
  const files = useProjectStore((s) => s.files);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const selectTable = useDiagramStore((s) => s.selectTable);

  const dbmlFiles = files.filter(
    (f) => !f.isDirectory && f.relativePath.endsWith(".dbml"),
  );

  const [tableName, setTableName] = useState("");
  const [tableSchema, setTableSchema] = useState("");
  const [headerColor, setHeaderColor] = useState<string>("");
  const [targetFile, setTargetFile] = useState<string>("");
  const [columns, setColumns] = useState<SchemaColumn[]>([defaultIdColumn()]);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("varchar");
  const [newColPk, setNewColPk] = useState(false);
  const [newColNotNull, setNewColNotNull] = useState(false);
  const [newColUnique, setNewColUnique] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTableName("");
      setTableSchema("");
      setHeaderColor("");
      setTargetFile(entryPoint ?? dbmlFiles[0]?.relativePath ?? "");
      setColumns([defaultIdColumn()]);
      setNewColName("");
      setNewColType("varchar");
      setNewColPk(false);
      setNewColNotNull(false);
      setNewColUnique(false);
      setError(null);
      setBusy(false);
    }
  }, [open, entryPoint, files]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeTableCreate();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeTableCreate]);

  const handleAddColumn = () => {
    const trimmed = newColName.trim();
    if (!trimmed) {
      setError("Column name is required.");
      return;
    }
    if (columns.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Column "${trimmed}" already exists.`);
      return;
    }
    setColumns((prev) => [
      ...prev,
      {
        name: trimmed,
        type: newColType.trim() || "varchar",
        isPrimaryKey: newColPk,
        isNullable: !newColNotNull,
        isUnique: newColUnique,
      },
    ]);
    setNewColName("");
    setNewColType("varchar");
    setNewColPk(false);
    setNewColNotNull(false);
    setNewColUnique(false);
    setError(null);
  };

  const handleRemoveColumn = (colName: string) => {
    setColumns((prev) => prev.filter((c) => c.name !== colName));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = tableName.trim();
      if (!trimmedName) {
        setError("Table name is required.");
        return;
      }
      if (!targetFile) {
        setError("Please select a target DBML file.");
        return;
      }
      if (columns.length === 0) {
        setError("At least one column is required.");
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const schema = tableSchema.trim() || undefined;
        await applyCreateTable(
          targetFile,
          {
            name: trimmedName,
            schema,
            headerColor: headerColor || undefined,
            columns,
          },
          files,
        );

        const newTableId = schema ? `${schema}.${trimmedName}` : `public.${trimmedName}`;
        selectTable(newTableId);
        closeTableCreate();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [tableName, tableSchema, headerColor, targetFile, columns, files, selectTable, closeTableCreate],
  );

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeTableCreate();
        }
      }}
    >
      <div
        className="table-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-create-title"
      >
        <header className="modal-header">
          <h2 id="table-create-title" className="modal-title">
            New table
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={closeTableCreate}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="table-edit-body inspector-body-scroll">
            <div className="inspector-section">
              <h3 className="inspector-section-title">Definition</h3>
              <div className="inspector-form-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
                <label>
                  Schema
                  <input
                    value={tableSchema}
                    onChange={(e) => setTableSchema(e.target.value)}
                    placeholder="public"
                    disabled={busy}
                  />
                </label>
                <label>
                  Table Name
                  <input
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="e.g. orders, user_profiles"
                    autoFocus
                    required
                    disabled={busy}
                  />
                </label>
              </div>

              {dbmlFiles.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <label className="inspector-insert-after" style={{ marginTop: 0 }}>
                    Target DBML File
                    <select
                      value={targetFile}
                      onChange={(e) => setTargetFile(e.target.value)}
                      disabled={busy}
                    >
                      {dbmlFiles.map((file) => (
                        <option key={file.relativePath} value={file.relativePath}>
                          {file.relativePath}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="inspector-section">
              <h3 className="inspector-section-title">Header color</h3>
              <div className="inspector-color-row">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`inspector-color-swatch ${headerColor === color ? "active" : ""}`}
                    style={{ background: color }}
                    title={color}
                    onClick={() => setHeaderColor(color)}
                  />
                ))}
                <input
                  type="color"
                  className="inspector-color-input"
                  value={headerColor || "#6366f1"}
                  onChange={(e) => setHeaderColor(e.target.value)}
                />
                {headerColor && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setHeaderColor("")}
                  >
                    Clear color
                  </button>
                )}
              </div>
            </div>

            <div className="inspector-section">
              <h3 className="inspector-section-title">
                Columns ({columns.length})
              </h3>
              <table className="inspector-columns">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>PK</th>
                    <th>Nullable</th>
                    <th>Unique</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr key={col.name}>
                      <td style={{ fontWeight: col.isPrimaryKey ? 600 : 400 }}>
                        {col.name}
                      </td>
                      <td className="inspector-column-type">{col.type}</td>
                      <td>{col.isPrimaryKey ? "✓" : "—"}</td>
                      <td>{col.isNullable ? "✓" : "—"}</td>
                      <td>{col.isUnique ? "✓" : "—"}</td>
                      <td className="inspector-row-actions">
                        <button
                          type="button"
                          className="btn-icon btn-icon-xs"
                          title="Remove column"
                          disabled={busy || columns.length <= 1}
                          onClick={() => handleRemoveColumn(col.name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="inspector-section inspector-section-muted">
              <h3 className="inspector-section-title">Add column</h3>
              <div className="inspector-form-grid inspector-column-editor">
                <label>
                  Name
                  <input
                    value={newColName}
                    placeholder="column_name"
                    disabled={busy}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddColumn();
                      }
                    }}
                  />
                </label>
                <label>
                  Type
                  <input
                    list="pg-create-types-modal"
                    value={newColType}
                    disabled={busy}
                    onChange={(e) => setNewColType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddColumn();
                      }
                    }}
                  />
                </label>
                <label className="inspector-check">
                  <input
                    type="checkbox"
                    checked={newColPk}
                    disabled={busy}
                    onChange={(e) => setNewColPk(e.target.checked)}
                  />
                  PK
                </label>
                <label className="inspector-check">
                  <input
                    type="checkbox"
                    checked={newColNotNull}
                    disabled={busy}
                    onChange={(e) => setNewColNotNull(e.target.checked)}
                  />
                  NOT NULL
                </label>
                <label className="inspector-check">
                  <input
                    type="checkbox"
                    checked={newColUnique}
                    disabled={busy}
                    onChange={(e) => setNewColUnique(e.target.checked)}
                  />
                  UNIQUE
                </label>
                <datalist id="pg-create-types-modal">
                  {PG_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div className="inspector-actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={busy || !newColName.trim()}
                  onClick={handleAddColumn}
                >
                  <Plus size={13} />
                  Add column
                </button>
              </div>
            </div>

            {error && <p className="inspector-error">{error}</p>}
          </div>

          <footer className="table-edit-footer">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={closeTableCreate}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={busy || !tableName.trim() || !targetFile || columns.length === 0}
            >
              {busy ? "Creating…" : "Create Table"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
