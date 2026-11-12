import {
  Check,
  ChevronDown,
  ChevronUp,
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

function resolveInsertPlacement(placement: string): AddColumnPlacement {
  if (placement === "__start__") return { position: "start" };
  if (placement === "__end__") return { position: "end" };
  return { afterColumn: placement };
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

  const removeColumn = (name: string) => {
    props.onError(null);
    if (props.mode === "draft") {
      props.onChange(props.columns.filter((c) => c.name !== name));
      return;
    }
    props.onRemove(name);
  };

  const moveColumn = (name: string, direction: "up" | "down") => {
    props.onError(null);
    if (props.mode === "draft") {
      const moved = moveColumnInList(props.columns, name, direction);
      if (moved) props.onChange(moved);
      return;
    }
    props.onMove(name, direction);
  };

  const handleUpdate = (originalName: string, next: SchemaColumn) => {
    const dup = findDuplicateColumnName(props.columns, next.name, originalName);
    if (dup) {
      props.onError(dup);
      return;
    }
    props.onError(null);
    if (props.mode === "draft") {
      const updated = updateColumnInList(props.columns, originalName, next);
      if (updated) props.onChange(updated);
      return;
    }
    props.onUpdate(originalName, next);
  };

  return (
    <section class="table-form-section">
      <PgTypeDatalist />

      <div class="table-form-section-header">
        <h3 class="table-form-section-title">
          Columns
          <span class="table-form-count">({props.columns.length})</span>
        </h3>
        <Show when={props.error}>
          <span class="table-form-inline-error">{props.error}</span>
        </Show>
      </div>

      <div class="table-form-columns-list" role="list">
        <For each={props.columns}>
          {(col, index) => (
            <div role="listitem">
              <ColumnRowItem
                column={col}
                index={index()}
                total={props.columns.length}
                disabled={props.disabled}
                onUpdate={(next) => handleUpdate(col.name, next)}
                onRemove={() => removeColumn(col.name)}
                onMove={(dir) => moveColumn(col.name, dir)}
              />
            </div>
          )}
        </For>
      </div>

      <div class="table-form-add-row">
        <input
          class="table-form-input table-form-input-name"
          placeholder="New column name"
          value={newColumn().name}
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
        <input
          class="table-form-input table-form-input-type"
          placeholder="type (e.g. integer)"
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
        <ColumnConstraintToggles
          column={newColumn()}
          disabled={props.disabled}
          onChange={(patch) => setNewColumn({ ...newColumn(), ...patch })}
        />
        <Show when={props.mode === "live" && props.columns.length > 0}>
          <select
            class="select-compact table-form-placement-select"
            value={insertPlacement()}
            onChange={(e) => setInsertPlacement(e.currentTarget.value)}
            disabled={props.disabled}
            title="Where to insert the new column"
          >
            <option value="__start__">At start</option>
            <For each={props.columns}>
              {(col) => (
                <option value={col.name}>After {col.name}</option>
              )}
            </For>
            <option value="__end__">At end</option>
          </select>
        </Show>
        <button
          type="button"
          class="btn btn-sm btn-primary table-form-add-btn"
          disabled={props.disabled || !newColumn().name.trim()}
          onClick={tryAddColumn}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </section>
  );
}

function ColumnRowItem(props: {
  column: SchemaColumn;
  index: number;
  total: number;
  disabled?: boolean;
  onUpdate: (next: SchemaColumn) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [draft, setDraft] = createSignal<SchemaColumn>({ ...props.column });

  createEffect(() => {
    setDraft({ ...props.column });
  });

  const isDirty = () => !columnsEqual(draft(), props.column);

  const save = () => {
    if (!isDirty()) return;
    props.onUpdate(draft());
  };

  return (
    <div class={`table-form-column-row ${isDirty() ? "dirty" : ""}`}>
      <div class="table-form-row-reorder">
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          disabled={props.disabled || props.index === 0}
          title="Move up"
          onClick={() => props.onMove("up")}
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          disabled={props.disabled || props.index === props.total - 1}
          title="Move down"
          onClick={() => props.onMove("down")}
        >
          <ChevronDown size={12} />
        </button>
      </div>

      <input
        class="table-form-input table-form-input-name"
        value={draft().name}
        disabled={props.disabled}
        onInput={(e) => setDraft({ ...draft(), name: e.currentTarget.value })}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />

      <input
        class="table-form-input table-form-input-type"
        list={PG_TYPES_DATALIST_ID}
        value={draft().type}
        disabled={props.disabled}
        onInput={(e) => setDraft({ ...draft(), type: e.currentTarget.value })}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />

      <ColumnConstraintToggles
        column={draft()}
        disabled={props.disabled}
        onChange={(patch) => {
          const next = { ...draft(), ...patch };
          setDraft(next);
          props.onUpdate(next);
        }}
      />

      <div class="table-form-row-actions">
        <Show when={isDirty()}>
          <button
            type="button"
            class="btn-icon btn-icon-xs btn-primary"
            title="Save changes"
            onClick={save}
          >
            <Check size={12} />
          </button>
        </Show>
        <button
          type="button"
          class="btn-icon btn-icon-xs text-danger"
          disabled={props.disabled}
          title="Delete column"
          onClick={props.onRemove}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
