import {
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AddColumnPlacement } from "../../../features/schema/dbml-edit";
import type { SchemaColumn } from "../../../types/schema";
import { columnsEqual, emptyColumn } from "./column-defaults";
import {
  findDuplicateColumnName,
  moveColumnInList,
  updateColumnInList,
} from "./column-helpers";
import { ColumnConstraintToggles } from "./ColumnConstraintToggles";
import { PG_TYPES_DATALIST_ID } from "./constants";
import { PgTypeDatalist } from "./PgTypeDatalist";

type DraftProps = {
  mode: "draft";
  columns: SchemaColumn[];
  onChange: (columns: SchemaColumn[]) => void;
  disabled?: boolean;
  error: string | null;
  onError: (message: string | null) => void;
};

type LiveProps = {
  mode: "live";
  columns: SchemaColumn[];
  disabled?: boolean;
  error: string | null;
  onError: (message: string | null) => void;
  onUpdate: (originalName: string, next: SchemaColumn) => void;
  onRemove: (name: string) => void;
  onMove: (name: string, direction: "up" | "down") => void;
  onAdd: (column: SchemaColumn, placement: AddColumnPlacement) => void;
};

export type ColumnsSectionProps = DraftProps | LiveProps;

export function ColumnsSection(props: ColumnsSectionProps) {
  const { columns, disabled, error, onError } = props;
  const [newColumn, setNewColumn] = useState<SchemaColumn>(emptyColumn);
  const [insertPlacement, setInsertPlacement] = useState<string>("__end__");

  useEffect(() => {
    if (props.mode === "live") {
      setNewColumn(emptyColumn());
      setInsertPlacement("__end__");
    }
  }, [props.mode, columns.length]);

  const tryAddColumn = () => {
    const trimmed = newColumn.name.trim();
    const candidate: SchemaColumn = {
      ...newColumn,
      name: trimmed,
      type: newColumn.type.trim() || "varchar",
    };
    const dup = findDuplicateColumnName(columns, candidate.name);
    if (dup) {
      onError(dup);
      return;
    }
    onError(null);

    if (props.mode === "draft") {
      props.onChange([...columns, candidate]);
      setNewColumn(emptyColumn());
      return;
    }

    props.onAdd(candidate, resolveInsertPlacement(insertPlacement));
    setNewColumn(emptyColumn());
  };

  return (
    <section className="inspector-section table-form-section">
      <div className="inspector-section-header">
        <h3 className="inspector-section-title">
          <Layers size={13} aria-hidden />
          Fields
        </h3>
        <span className="inspector-section-count">{columns.length}</span>
      </div>

      <div className="table-form-columns-shell">
        <table className="inspector-columns table-form-columns">
          <thead>
            <tr>
              <th className="table-form-col-order" aria-label="Order" />
              <th>Name</th>
              <th>Type</th>
              <th className="table-form-col-flags">Constraints</th>
              {props.mode === "live" && <th className="table-form-col-actions" />}
              {props.mode === "draft" && (
                <th className="table-form-col-actions" aria-label="Remove" />
              )}
            </tr>
          </thead>
          <tbody>
            {columns.map((col, index) =>
              props.mode === "draft" ? (
                <DraftColumnRow
                  key={`draft-col-${index}`}
                  column={col}
                  index={index}
                  total={columns.length}
                  disabled={disabled}
                  onChange={(next) => {
                    const updated = updateColumnInList(
                      columns,
                      col.name,
                      next,
                    );
                    if (!updated) {
                      onError(
                        findDuplicateColumnName(columns, next.name, col.name),
                      );
                      return;
                    }
                    onError(null);
                    props.onChange(updated);
                  }}
                  onMove={(direction) =>
                    props.onChange(moveColumnInList(columns, col.name, direction))
                  }
                  onRemove={() => {
                    if (columns.length <= 1) {
                      return;
                    }
                    props.onChange(columns.filter((c) => c.name !== col.name));
                  }}
                  canRemove={columns.length > 1}
                />
              ) : (
                <LiveColumnRow
                  key={col.name}
                  column={col}
                  index={index}
                  total={columns.length}
                  disabled={disabled}
                  onSave={(next) => props.onUpdate(col.name, next)}
                  onDelete={() => props.onRemove(col.name)}
                  onMoveUp={() => props.onMove(col.name, "up")}
                  onMoveDown={() => props.onMove(col.name, "down")}
                />
              ),
            )}
          </tbody>
        </table>

        <div className="table-form-add-panel">
          <p className="table-form-add-label">Add field</p>
          <div className="table-form-add-grid">
            <label>
              Name
              <input
                value={newColumn.name}
                placeholder="column_name"
                disabled={disabled}
                onChange={(e) =>
                  setNewColumn({ ...newColumn, name: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tryAddColumn();
                  }
                }}
              />
            </label>
            <label>
              Type
              <input
                list={PG_TYPES_DATALIST_ID}
                value={newColumn.type}
                disabled={disabled}
                onChange={(e) =>
                  setNewColumn({ ...newColumn, type: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tryAddColumn();
                  }
                }}
              />
            </label>
            <ColumnConstraintToggles
              column={newColumn}
              disabled={disabled}
              onChange={setNewColumn}
            />
          </div>

          {props.mode === "live" && (
            <label className="table-form-insert-after">
              Insert
              <select
                value={insertPlacement}
                disabled={disabled}
                onChange={(e) => setInsertPlacement(e.target.value)}
              >
                <option value="__start__">At start</option>
                {columns.map((col) => (
                  <option key={col.name} value={col.name}>
                    After {col.name}
                  </option>
                ))}
                <option value="__end__">At end</option>
              </select>
            </label>
          )}

          <button
            type="button"
            className="btn btn-sm btn-ghost table-form-add-btn"
            disabled={disabled || !newColumn.name.trim()}
            onClick={tryAddColumn}
          >
            <Plus size={13} />
            Add field
          </button>
        </div>
      </div>

      {error && <p className="inspector-error">{error}</p>}
      <PgTypeDatalist />
    </section>
  );
}

function DraftColumnRow({
  column,
  index,
  total,
  disabled,
  onChange,
  onMove,
  onRemove,
  canRemove,
}: {
  column: SchemaColumn;
  index: number;
  total: number;
  disabled?: boolean;
  onChange: (column: SchemaColumn) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <tr className={column.isPrimaryKey ? "table-form-row-pk" : undefined}>
      <td className="inspector-order-cell">
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled || index === 0}
          title="Move up"
          onClick={() => onMove("up")}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled || index >= total - 1}
          title="Move down"
          onClick={() => onMove("down")}
        >
          <ChevronDown size={14} />
        </button>
      </td>
      <td>
        <input
          className="inspector-inline-input"
          value={column.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...column, name: e.target.value })}
        />
      </td>
      <td>
        <input
          className="inspector-inline-input"
          list={PG_TYPES_DATALIST_ID}
          value={column.type}
          disabled={disabled}
          onChange={(e) => onChange({ ...column, type: e.target.value })}
        />
      </td>
      <td>
        <ColumnConstraintToggles
          column={column}
          compact
          disabled={disabled}
          onChange={onChange}
        />
      </td>
      <td className="inspector-row-actions">
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          title="Remove column"
          disabled={disabled || !canRemove}
          onClick={onRemove}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

function LiveColumnRow({
  column,
  index,
  total,
  disabled,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  column: SchemaColumn;
  index: number;
  total: number;
  disabled?: boolean;
  onSave: (column: SchemaColumn) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [draft, setDraft] = useState(column);

  useEffect(() => {
    setDraft(column);
  }, [column]);

  const dirty = !columnsEqual(draft, column);
  const draftName = draft.name.trim();
  const canSave = dirty && draftName.length > 0;

  return (
    <tr
      className={`${column.isPrimaryKey ? "table-form-row-pk" : ""} ${dirty ? "table-form-row-dirty" : ""}`}
    >
      <td className="inspector-order-cell">
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled || index === 0}
          title="Move up"
          onClick={onMoveUp}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          className="btn-icon btn-icon-xs"
          disabled={disabled || index >= total - 1}
          title="Move down"
          onClick={onMoveDown}
        >
          <ChevronDown size={14} />
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
          list={PG_TYPES_DATALIST_ID}
          value={draft.type}
          disabled={disabled}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        />
      </td>
      <td>
        <ColumnConstraintToggles
          column={draft}
          compact
          disabled={disabled}
          onChange={setDraft}
        />
      </td>
      <td className="inspector-row-actions">
        <button
          type="button"
          className={`btn-icon btn-icon-xs ${canSave ? "table-form-save-active" : ""}`}
          disabled={disabled || !canSave}
          title={dirty ? "Save column changes" : "No changes"}
          onClick={() => onSave({ ...draft, name: draftName })}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          className="btn-icon btn-icon-xs table-form-delete-btn"
          disabled={disabled}
          title="Delete column"
          onClick={onDelete}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
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
