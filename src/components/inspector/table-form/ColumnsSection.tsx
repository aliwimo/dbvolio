import {
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  Trash2,
} from "lucide-solid";
import { createSignal, createEffect, For, Show } from "solid-js";
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

function resolveInsertPlacement(value: string): AddColumnPlacement {
  if (value === "__start__") {
    return { position: "start" };
  }
  if (value === "__end__") {
    return { position: "end" };
  }
  return { afterColumn: value };
}

export function ColumnsSection(props: ColumnsSectionProps) {
  const [newColumn, setNewColumn] = createSignal<SchemaColumn>(emptyColumn());
  const [insertPlacement, setInsertPlacement] = createSignal<string>("__end__");

  createEffect(() => {
    if (props.mode === "live") {
      setNewColumn(emptyColumn());
      setInsertPlacement("__end__");
    }
  });

  const tryAddColumn = () => {
    const cur = newColumn();
    const trimmed = cur.name.trim();
    const candidate: SchemaColumn = {
      ...cur,
      name: trimmed,
      type: cur.type.trim() || "varchar",
    };
    const dup = findDuplicateColumnName(props.columns, candidate.name);
    if (dup) {
      props.onError(dup);
      return;
    }
    props.onError(null);

    if (props.mode === "draft") {
      props.onChange([...props.columns, candidate]);
      setNewColumn(emptyColumn());
      return;
    }

    props.onAdd(candidate, resolveInsertPlacement(insertPlacement()));
    setNewColumn(emptyColumn());
  };

  return (
    <section class="inspector-section table-form-section">
      <PgTypeDatalist />

      <div class="inspector-section-header">
        <h3 class="inspector-section-title">
          <Layers size={13} aria-hidden />
          Fields
        </h3>
        <span class="inspector-section-count">{props.columns.length}</span>
      </div>

      <div class="table-form-columns-shell">
        <table class="inspector-columns table-form-columns">
          <thead>
            <tr>
              <th class="table-form-col-order" aria-label="Order" />
              <th>Name</th>
              <th>Type</th>
              <th class="table-form-col-flags">Constraints</th>
              <Show when={props.mode === "live"}>
                <th class="table-form-col-actions" />
              </Show>
              <Show when={props.mode === "draft"}>
                <th class="table-form-col-actions" aria-label="Remove" />
              </Show>
            </tr>
          </thead>
          <tbody>
            <For each={props.columns}>
              {(col, index) =>
                props.mode === "draft" ? (
                  <DraftColumnRow
                    column={col}
                    index={index()}
                    total={props.columns.length}
                    disabled={props.disabled}
                    onChange={(next) => {
                      const updated = updateColumnInList(
                        props.columns,
                        col.name,
                        next,
                      );
                      if (!updated) {
                        props.onError(
                          findDuplicateColumnName(props.columns, next.name, col.name),
                        );
                        return;
                      }
                      props.onError(null);
                      props.onChange(updated);
                    }}
                    onMove={(direction) =>
                      props.onChange(
                        moveColumnInList(props.columns, col.name, direction) ??
                          props.columns,
                      )
                    }
                    onRemove={() => {
                      if (props.columns.length <= 1) {
                        return;
                      }
                      props.onChange(props.columns.filter((c) => c.name !== col.name));
                    }}
                    canRemove={props.columns.length > 1}
                  />
                ) : (
                  <LiveColumnRow
                    column={col}
                    index={index()}
                    total={props.columns.length}
                    disabled={props.disabled}
                    onSave={(next) => props.onUpdate(col.name, next)}
                    onDelete={() => props.onRemove(col.name)}
                    onMoveUp={() => props.onMove(col.name, "up")}
                    onMoveDown={() => props.onMove(col.name, "down")}
                  />
                )
              }
            </For>
          </tbody>
        </table>

        <div class="table-form-add-panel">
          <p class="table-form-add-label">Add field</p>
          <div class="table-form-add-grid">
            <label>
              Name
              <input
                value={newColumn().name}
                placeholder="column_name"
                disabled={props.disabled}
                onInput={(e) =>
                  setNewColumn({ ...newColumn(), name: e.currentTarget.value })
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
                value={newColumn().type}
                disabled={props.disabled}
                onInput={(e) =>
                  setNewColumn({ ...newColumn(), type: e.currentTarget.value })
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
              column={newColumn()}
              disabled={props.disabled}
              onChange={setNewColumn}
            />
          </div>

          <Show when={props.mode === "live"}>
            <label class="table-form-insert-after">
              Insert
              <select
                value={insertPlacement()}
                disabled={props.disabled}
                onChange={(e) => setInsertPlacement(e.currentTarget.value)}
              >
                <option value="__start__">At start</option>
                <For each={props.columns}>
                  {(col) => (
                    <option value={col.name}>After {col.name}</option>
                  )}
                </For>
                <option value="__end__">At end</option>
              </select>
            </label>
          </Show>

          <button
            type="button"
            class="btn btn-sm btn-ghost table-form-add-btn"
            disabled={props.disabled || !newColumn().name.trim()}
            onClick={tryAddColumn}
          >
            <Plus size={13} />
            Add field
          </button>
        </div>
      </div>
    </section>
  );
}

function DraftColumnRow(props: {
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
    <tr class={props.column.isPrimaryKey ? "table-form-row-pk" : undefined}>
      <td class="inspector-order-cell">
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          disabled={props.disabled || props.index === 0}
          title="Move up"
          onClick={() => props.onMove("up")}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          disabled={props.disabled || props.index >= props.total - 1}
          title="Move down"
          onClick={() => props.onMove("down")}
        >
          <ChevronDown size={14} />
        </button>
      </td>
      <td>
        <input
          class="inspector-inline-input"
          value={props.column.name}
          disabled={props.disabled}
          onInput={(e) =>
            props.onChange({ ...props.column, name: e.currentTarget.value })
          }
        />
      </td>
      <td>
        <input
          class="inspector-inline-input"
          list={PG_TYPES_DATALIST_ID}
          value={props.column.type}
          disabled={props.disabled}
          onInput={(e) =>
            props.onChange({ ...props.column, type: e.currentTarget.value })
          }
        />
      </td>
      <td>
        <ColumnConstraintToggles
          column={props.column}
          compact
          disabled={props.disabled}
          onChange={props.onChange}
        />
      </td>
      <td class="inspector-row-actions">
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          title="Remove column"
          disabled={props.disabled || !props.canRemove}
          onClick={props.onRemove}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

function LiveColumnRow(props: {
  column: SchemaColumn;
  index: number;
  total: number;
  disabled?: boolean;
  onSave: (column: SchemaColumn) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [draft, setDraft] = createSignal<SchemaColumn>(props.column);

  createEffect(() => {
    setDraft(props.column);
  });

  const dirty = () => !columnsEqual(draft(), props.column);
  const draftName = () => draft().name.trim();
  const canSave = () => dirty() && draftName().length > 0;

  return (
    <tr
      class={`${props.column.isPrimaryKey ? "table-form-row-pk" : ""} ${dirty() ? "table-form-row-dirty" : ""}`}
    >
      <td class="inspector-order-cell">
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          disabled={props.disabled || props.index === 0}
          title="Move up"
          onClick={props.onMoveUp}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          disabled={props.disabled || props.index >= props.total - 1}
          title="Move down"
          onClick={props.onMoveDown}
        >
          <ChevronDown size={14} />
        </button>
      </td>
      <td>
        <input
          class="inspector-inline-input"
          value={draft().name}
          disabled={props.disabled}
          onInput={(e) =>
            setDraft({ ...draft(), name: e.currentTarget.value })
          }
        />
      </td>
      <td>
        <input
          class="inspector-inline-input"
          list={PG_TYPES_DATALIST_ID}
          value={draft().type}
          disabled={props.disabled}
          onInput={(e) =>
            setDraft({ ...draft(), type: e.currentTarget.value })
          }
        />
      </td>
      <td>
        <ColumnConstraintToggles
          column={draft()}
          compact
          disabled={props.disabled}
          onChange={setDraft}
        />
      </td>
      <td class="inspector-row-actions">
        <button
          type="button"
          class={`btn-icon btn-icon-xs ${canSave() ? "table-form-save-active" : ""}`}
          disabled={props.disabled || !canSave()}
          title={dirty() ? "Save column changes" : "No changes"}
          onClick={() => props.onSave({ ...draft(), name: draftName() })}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          class="btn-icon btn-icon-xs table-form-delete-btn"
          disabled={props.disabled}
          title="Delete column"
          onClick={props.onDelete}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}
