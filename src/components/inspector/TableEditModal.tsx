import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  applyAddColumn,
  applyMoveColumn,
  applyRemoveColumn,
  applyUpdateColumn,
  applySetTableHeaderColor,
  applyUpdateTableMeta,
  openTableSourceFile,
} from "../../features/schema/apply-schema-edits";
import type { AddColumnPlacement } from "../../features/schema/dbml-edit";
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

function emptyColumn(): SchemaColumn {
  return {
    name: "new_column",
    type: "varchar",
    isPrimaryKey: false,
    isNullable: true,
    isUnique: false,
  };
}

export function TableEditModal() {
  const open = useUiStore((s) => s.tableEditOpen);
  const closeTableEdit = useUiStore((s) => s.closeTableEdit);
  const table = useDiagramStore((s) => s.selectedTable());
  const files = useProjectStore((s) => s.files);
  const projectFiles = files.filter((f) => !f.isDirectory);

  const [tableName, setTableName] = useState("");
  const [tableSchema, setTableSchema] = useState("");
  const [headerColor, setHeaderColor] = useState<string>("");
  const [newColumn, setNewColumn] = useState<SchemaColumn>(emptyColumn);
  const [insertPlacement, setInsertPlacement] = useState<string>("__end__");
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !table) {
      return;
    }
    setTableName(table.name);
    setTableSchema(table.schema ?? "");
    setHeaderColor(table.headerColor ?? "");
    setEditError(null);
  }, [open, table]);

  useEffect(() => {
    if (open && !table) {
      closeTableEdit();
    }
  }, [open, table, closeTableEdit]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTableEdit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeTableEdit]);

  const runEdit = useCallback(
    async (action: () => Promise<boolean>) => {
      setBusy(true);
      setEditError(null);
      try {
        const ok = await action();
        if (!ok) {
          setEditError(
            "Could not find this table in project DBML files. Open or create the table definition first.",
          );
        }
      } catch (error) {
        setEditError(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  if (!open || !table) {
    return null;
  }

  const title = table.schema ? `${table.schema}.${table.name}` : table.name;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeTableEdit();
        }
      }}
    >
      <div
        className="table-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-edit-title"
      >
        <header className="modal-header">
          <h2 id="table-edit-title" className="modal-title">
            Edit table — {title}
          </h2>
          <button
            type="button"
            className="btn-icon"
            onClick={closeTableEdit}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="table-edit-body inspector-body-scroll">
          <div className="inspector-section">
            <h3 className="inspector-section-title">Definition</h3>
            <div className="inspector-form-grid">
              <label>
                Schema
                <input
                  value={tableSchema}
                  onChange={(e) => setTableSchema(e.target.value)}
                  placeholder="public"
                />
              </label>
              <label>
                Name
                <input
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                />
              </label>
            </div>
            <div className="inspector-actions">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busy}
                onClick={() =>
                  void runEdit(() =>
                    applyUpdateTableMeta(
                      table,
                      {
                        name: tableName.trim() || table.name,
                        schema: tableSchema.trim() || undefined,
                      },
                      projectFiles,
                    ),
                  )
                }
              >
                Apply
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={busy}
                onClick={() => void openTableSourceFile(table, projectFiles)}
              >
                Open source
              </button>
            </div>
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
                  onClick={() => {
                    setHeaderColor(color);
                    void runEdit(() =>
                      applySetTableHeaderColor(table, color, projectFiles),
                    );
                  }}
                />
              ))}
              <input
                type="color"
                className="inspector-color-input"
                value={headerColor || "#6366f1"}
                onChange={(e) => {
                  const color = e.target.value;
                  setHeaderColor(color);
                  void runEdit(() =>
                    applySetTableHeaderColor(table, color, projectFiles),
                  );
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setHeaderColor("");
                  void runEdit(() =>
                    applySetTableHeaderColor(table, null, projectFiles),
                  );
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="inspector-section">
            <h3 className="inspector-section-title">Fields</h3>
            <table className="inspector-columns inspector-columns-editable">
              <thead>
                <tr>
                  <th aria-label="Order" />
                  <th>Name</th>
                  <th>Type</th>
                  <th>PK</th>
                  <th>NN</th>
                  <th>UQ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col, index) => (
                  <EditableColumnRow
                    key={col.name}
                    column={col}
                    index={index}
                    total={table.columns.length}
                    disabled={busy}
                    onSave={(next) =>
                      runEdit(() =>
                        applyUpdateColumn(table, col.name, next, projectFiles),
                      )
                    }
                    onDelete={() =>
                      runEdit(() =>
                        applyRemoveColumn(table, col.name, projectFiles),
                      )
                    }
                    onMoveUp={() =>
                      runEdit(() =>
                        applyMoveColumn(table, col.name, "up", projectFiles),
                      )
                    }
                    onMoveDown={() =>
                      runEdit(() =>
                        applyMoveColumn(table, col.name, "down", projectFiles),
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="inspector-section inspector-section-muted">
            <h3 className="inspector-section-title">New field</h3>
            <ColumnEditor
              column={newColumn}
              onChange={setNewColumn}
              disabled={busy}
            />
            <label className="inspector-insert-after">
              Position
              <select
                className="select-compact"
                value={insertPlacement}
                disabled={busy}
                onChange={(e) => setInsertPlacement(e.target.value)}
              >
                <option value="__start__">Start of table</option>
                {table.columns.map((col) => (
                  <option key={col.name} value={col.name}>
                    After {col.name}
                  </option>
                ))}
                <option value="__end__">End of table</option>
              </select>
            </label>
            <div className="inspector-actions">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busy || !newColumn.name.trim()}
                onClick={() =>
                  void runEdit(async () => {
                    const placement = resolveInsertPlacement(insertPlacement);
                    const ok = await applyAddColumn(
                      table,
                      {
                        ...newColumn,
                        name: newColumn.name.trim(),
                      },
                      projectFiles,
                      placement,
                    );
                    if (ok) {
                      setNewColumn(emptyColumn());
                    }
                    return ok;
                  })
                }
              >
                Add field
              </button>
            </div>
          </div>

          {editError && <p className="inspector-error">{editError}</p>}
        </div>

        <footer className="table-edit-footer">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={closeTableEdit}
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

function resolveInsertPlacement(value: string): AddColumnPlacement {
  if (value === "__start__") {
    return { position: "start" };
  }
  if (value === "__end__") {
    return { position: "end" };
  }
  return { afterColumn: value };
}

function ColumnEditor({
  column,
  onChange,
  disabled,
}: {
  column: SchemaColumn;
  onChange: (column: SchemaColumn) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inspector-form-grid inspector-column-editor">
      <label>
        Name
        <input
          value={column.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...column, name: e.target.value })}
        />
      </label>
      <label>
        Type
        <input
          list="pg-types-modal"
          value={column.type}
          disabled={disabled}
          onChange={(e) => onChange({ ...column, type: e.target.value })}
        />
      </label>
      <label className="inspector-check">
        <input
          type="checkbox"
          checked={column.isPrimaryKey}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...column, isPrimaryKey: e.target.checked })
          }
        />
        PK
      </label>
      <label className="inspector-check">
        <input
          type="checkbox"
          checked={!column.isNullable}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...column, isNullable: !e.target.checked })
          }
        />
        NOT NULL
      </label>
      <label className="inspector-check">
        <input
          type="checkbox"
          checked={column.isUnique}
          disabled={disabled}
          onChange={(e) => onChange({ ...column, isUnique: e.target.checked })}
        />
        UNIQUE
      </label>
      <datalist id="pg-types-modal">
        {PG_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

function EditableColumnRow({
  column,
  index,
  total,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  column: SchemaColumn;
  index: number;
  total: number;
  onSave: (column: SchemaColumn) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(column);

  useEffect(() => {
    setDraft(column);
  }, [column]);

  return (
    <tr>
      <td className="inspector-order-cell">
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled || index === 0}
          title="Move up"
          onClick={onMoveUp}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled || index >= total - 1}
          title="Move down"
          onClick={onMoveDown}
        >
          ↓
        </button>
      </td>
      <td>
        <input
          className="inspector-inline-input"
          value={draft.name}
          disabled={disabled}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </td>
      <td>
        <input
          className="inspector-inline-input"
          list="pg-types-modal"
          value={draft.type}
          disabled={disabled}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={draft.isPrimaryKey}
          disabled={disabled}
          onChange={(e) =>
            setDraft({ ...draft, isPrimaryKey: e.target.checked })
          }
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={!draft.isNullable}
          disabled={disabled}
          onChange={(e) =>
            setDraft({ ...draft, isNullable: !e.target.checked })
          }
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={draft.isUnique}
          disabled={disabled}
          onChange={(e) => setDraft({ ...draft, isUnique: e.target.checked })}
        />
      </td>
      <td className="inspector-row-actions">
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled}
          title="Apply column"
          onClick={() => onSave(draft)}
        >
          ✓
        </button>
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled}
          title="Delete column"
          onClick={onDelete}
        >
          ×
        </button>
      </td>
    </tr>
  );
}
