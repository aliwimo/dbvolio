import {
  ArrowLeft,
  ArrowRight,
  Hash,
  KeyRound,
  Layers,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  Table2,
} from "lucide-solid";
import { createMemo, For, Show } from "solid-js";
import { resolveGroupColor } from "../diagram/TableGroupNode";
import { useDiagramStore } from "../../stores/diagram-store";
import { useUiStore } from "../../stores/ui-store";
import type { SchemaEnum, SchemaModel, SchemaTable } from "../../types/schema";
import { Button } from "../ui";

function findMatchingEnum(
  colType: string,
  tableSchema: string | undefined,
  enums: SchemaEnum[],
): SchemaEnum | undefined {
  if (enums.length === 0) {
    return undefined;
  }
  const normalized = colType.trim();
  return enums.find((e) => {
    const enumFull = e.schema ? `${e.schema}.${e.name}` : e.name;
    if (normalized === enumFull || normalized === e.id) {
      return true;
    }
    const effectiveTableSchema = tableSchema || "public";
    const effectiveEnumSchema = e.schema || "public";
    return (
      normalized === e.name && effectiveTableSchema === effectiveEnumSchema
    );
  });
}

function formatTableDisplayName(
  tableId: string,
  model: SchemaModel | null,
): string {
  const found = model?.tables.find((t) => t.id === tableId);
  if (found) {
    return found.schema ? `${found.schema}.${found.name}` : found.name;
  }
  return tableId.replace(/^public\./, "");
}

export function SchemaInspector() {
  const table = () => useDiagramStore((s) => s.selectedTable());
  const model = () => useDiagramStore((s) => s.lastValidModel);
  const selectTable = useDiagramStore.getState().selectTable;
  const openTableEdit = useUiStore.getState().openTableEdit;
  const openTableCreate = useUiStore.getState().openTableCreate;

  return (
    <div class="panel panel-fill inspector-panel">
      <Show
        when={table()}
        fallback={
          <>
            <div class="inspector-header">
              <div class="inspector-header-top">
                <div class="inspector-title-group">
                  <Table2 size={14} class="inspector-panel-icon" aria-hidden />
                  <span class="inspector-panel-title">Properties</span>
                </div>
                <div class="inspector-header-actions">
                  <button
                    type="button"
                    class="btn btn-sm btn-ghost inspector-new-btn"
                    onClick={openTableCreate}
                    title="Create new table"
                  >
                    <Plus size={13} aria-hidden />
                    New table
                  </button>
                </div>
              </div>
            </div>
            <div class="inspector-body inspector-empty">
              <div class="inspector-empty-state">
                <Table2 size={24} class="inspector-empty-icon" aria-hidden />
                <p class="inspector-empty-title">No table selected</p>
                <p class="empty-hint">
                  Select a table in the diagram to inspect its fields, relationships,
                  and indexes.
                </p>
              </div>
            </div>
          </>
        }
      >
        {(t) => (
          <TableInspectorView
            table={t()}
            model={model()}
            onEdit={openTableEdit}
            onSelectTable={selectTable}
          />
        )}
      </Show>
    </div>
  );
}

function TableInspectorView(props: {
  table: SchemaTable;
  model: SchemaModel | null;
  onEdit: () => void;
  onSelectTable: (tableId: string) => void;
}) {
  const enums = () => props.model?.enums ?? [];
  const references = () => props.model?.references ?? [];

  const outgoingRefs = createMemo(() =>
    references().filter((r) => r.sourceTableId === props.table.id),
  );

  const incomingRefs = createMemo(() =>
    references().filter(
      (r) =>
        r.targetTableId === props.table.id &&
        r.sourceTableId !== props.table.id,
    ),
  );

  const fkColumnTargets = createMemo(() => {
    const map = new Map<
      string,
      { targetTableId: string; targetColumn: string }
    >();
    for (const ref of outgoingRefs()) {
      ref.sourceColumns.forEach((colName, idx) => {
        const targetCol = ref.targetColumns[idx] ?? ref.targetColumns[0] ?? "";
        map.set(colName, {
          targetTableId: ref.targetTableId,
          targetColumn: targetCol,
        });
      });
    }
    return map;
  });

  const totalRelations = () => outgoingRefs().length + incomingRefs().length;
  const tableGroup = createMemo(() =>
    props.table.groupId
      ? props.model?.tableGroups?.find((g) => g.id === props.table.groupId)
      : undefined,
  );
  const effectiveHeaderColor = () =>
    props.table.headerColor ??
    (tableGroup() ? resolveGroupColor(tableGroup()!) : undefined);

  return (
    <>
      <div class="inspector-header">
        <div class="inspector-header-top">
          <div class="inspector-title-group">
            <Show when={effectiveHeaderColor()}>
              {(color) => (
                <span
                  class="inspector-header-color-dot"
                  style={{ background: color() }}
                  title={`Header color ${color()}`}
                />
              )}
            </Show>
            <div class="inspector-title-text">
              <Show when={props.table.schema}>
                {(schema) => (
                  <span class="inspector-schema-badge">{schema()}</span>
                )}
              </Show>
              <h3 class="inspector-table-name" title={props.table.name}>
                {props.table.name}
              </h3>
            </div>
          </div>
          <div class="inspector-header-actions">
            <Button
              variant="outline"
              size="sm"
              class="inspector-edit-btn"
              onClick={props.onEdit}
            >
              <Pencil size={13} aria-hidden />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div class="inspector-body inspector-body-scroll">
        <div class="inspector-overview-section">
          <div class="inspector-meta-pills">
            <Show when={tableGroup()}>
              {(g) => (
                <span
                  class="inspector-meta-pill"
                  title={
                    g().note
                      ? `Group: ${g().name} — ${g().note}`
                      : `Group: ${g().name}`
                  }
                >
                  Group: {g().name}
                </span>
              )}
            </Show>
            <span class="inspector-meta-pill">
              {props.table.columns.length}{" "}
              {props.table.columns.length === 1 ? "field" : "fields"}
            </span>
            <Show when={totalRelations() > 0}>
              <span class="inspector-meta-pill">
                {totalRelations()}{" "}
                {totalRelations() === 1 ? "relation" : "relations"}
              </span>
            </Show>
            <Show when={props.table.indexes.length > 0}>
              <span class="inspector-meta-pill">
                {props.table.indexes.length}{" "}
                {props.table.indexes.length === 1 ? "index" : "indexes"}
              </span>
            </Show>
          </div>
          <Show when={props.table.note}>
            {(note) => <p class="inspector-table-note">{note()}</p>}
          </Show>
        </div>

        <div class="inspector-section">
          <div class="inspector-section-header">
            <h4 class="inspector-section-title">
              <Layers size={13} aria-hidden />
              Fields
            </h4>
            <span class="inspector-section-count">
              {props.table.columns.length}
            </span>
          </div>

          <div class="inspector-fields-list">
            <For each={props.table.columns}>
              {(col) => {
                const fkTarget = () => fkColumnTargets().get(col.name);
                const matchedEnum = () =>
                  findMatchingEnum(col.type, props.table.schema, enums());
                const hasDetails = () =>
                  Boolean(col.note) ||
                  Boolean(col.defaultValue) ||
                  Boolean(matchedEnum()) ||
                  Boolean(fkTarget());

                return (
                  <div class="inspector-field-item">
                    <div class="inspector-field-main">
                      <div class="inspector-field-name-wrap">
                        <span
                          class={`inspector-field-name ${col.isPrimaryKey ? "is-pk" : ""}`}
                          title={col.name}
                        >
                          {col.name}
                        </span>
                        <div class="inspector-field-badges">
                          <Show when={col.isPrimaryKey}>
                            <span
                              class="inspector-badge pk"
                              title="Primary key"
                            >
                              <KeyRound size={10} aria-hidden />
                              PK
                            </span>
                          </Show>
                          <Show when={fkTarget()}>
                            {(fk) => (
                              <button
                                type="button"
                                class="inspector-badge fk inspector-badge-btn"
                                title={`Foreign key → ${formatTableDisplayName(fk().targetTableId, props.model)}.${fk().targetColumn}`}
                                onClick={() =>
                                  props.onSelectTable(fk().targetTableId)
                                }
                              >
                                FK
                              </button>
                            )}
                          </Show>
                          <Show when={!col.isNullable && !col.isPrimaryKey}>
                            <span class="inspector-badge nn" title="Not null">
                              NN
                            </span>
                          </Show>
                          <Show when={col.isUnique && !col.isPrimaryKey}>
                            <span class="inspector-badge uq" title="Unique">
                              UQ
                            </span>
                          </Show>
                          <Show when={col.isAutoIncrement}>
                            <span
                              class="inspector-badge ai"
                              title="Auto increment"
                            >
                              AI
                            </span>
                          </Show>
                        </div>
                      </div>

                      <span class="inspector-field-type" title={col.type}>
                        {col.type}
                      </span>
                    </div>

                    <Show when={hasDetails()}>
                      <div class="inspector-field-details">
                        <Show when={fkTarget()}>
                          {(fk) => (
                            <div class="inspector-field-detail-row">
                              <span class="inspector-detail-label">Ref</span>
                              <button
                                type="button"
                                class="inspector-ref-link"
                                onClick={() =>
                                  props.onSelectTable(fk().targetTableId)
                                }
                              >
                                <ArrowRight size={11} aria-hidden />
                                <span>
                                  {formatTableDisplayName(
                                    fk().targetTableId,
                                    props.model,
                                  )}
                                  .{fk().targetColumn}
                                </span>
                              </button>
                            </div>
                          )}
                        </Show>

                        <Show when={col.defaultValue !== undefined}>
                          <div class="inspector-field-detail-row">
                            <span class="inspector-detail-label">Default</span>
                            <code class="inspector-default-code">
                              {col.defaultValue}
                            </code>
                          </div>
                        </Show>

                        <Show when={matchedEnum()}>
                          {(e) => (
                            <Show when={e().values.length > 0}>
                              <div class="inspector-field-detail-row inspector-enum-row">
                                <span class="inspector-detail-label">Values</span>
                                <div class="inspector-enum-chips">
                                  <For each={e().values}>
                                    {(val) => (
                                      <span class="inspector-enum-chip">
                                        {val}
                                      </span>
                                    )}
                                  </For>
                                </div>
                              </div>
                            </Show>
                          )}
                        </Show>

                        <Show when={col.note}>
                          {(note) => (
                            <p class="inspector-field-note">{note()}</p>
                          )}
                        </Show>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        <Show when={totalRelations() > 0}>
          <div class="inspector-section">
            <div class="inspector-section-header">
              <h4 class="inspector-section-title">
                <Link2 size={13} aria-hidden />
                Relationships
              </h4>
              <span class="inspector-section-count">{totalRelations()}</span>
            </div>

            <div class="inspector-relations-list">
              <For each={outgoingRefs()}>
                {(ref) => {
                  const targetName = () =>
                    formatTableDisplayName(ref.targetTableId, props.model);
                  return (
                    <button
                      type="button"
                      class="inspector-relation-card"
                      onClick={() => props.onSelectTable(ref.targetTableId)}
                      title={`Select ${targetName()}`}
                    >
                      <span class="inspector-relation-dir outgoing">
                        <ArrowRight size={12} aria-hidden />
                      </span>
                      <div class="inspector-relation-body">
                        <div class="inspector-relation-cols">
                          <span class="inspector-relation-local">
                            {ref.sourceColumns.join(", ")}
                          </span>
                          <span class="inspector-relation-arrow">→</span>
                          <span class="inspector-relation-remote">
                            {targetName()}.{ref.targetColumns.join(", ")}
                          </span>
                        </div>
                        <span class="inspector-relation-subtitle">
                          References {targetName()}
                        </span>
                      </div>
                    </button>
                  );
                }}
              </For>

              <For each={incomingRefs()}>
                {(ref) => {
                  const sourceName = () =>
                    formatTableDisplayName(ref.sourceTableId, props.model);
                  return (
                    <button
                      type="button"
                      class="inspector-relation-card"
                      onClick={() => props.onSelectTable(ref.sourceTableId)}
                      title={`Select ${sourceName()}`}
                    >
                      <span class="inspector-relation-dir incoming">
                        <ArrowLeft size={12} aria-hidden />
                      </span>
                      <div class="inspector-relation-body">
                        <div class="inspector-relation-cols">
                          <span class="inspector-relation-remote">
                            {sourceName()}.{ref.sourceColumns.join(", ")}
                          </span>
                          <span class="inspector-relation-arrow">→</span>
                          <span class="inspector-relation-local">
                            {ref.targetColumns.join(", ")}
                          </span>
                        </div>
                        <span class="inspector-relation-subtitle">
                          Referenced by {sourceName()}
                        </span>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        <Show when={props.table.indexes.length > 0}>
          <div class="inspector-section">
            <div class="inspector-section-header">
              <h4 class="inspector-section-title">
                <ListChecks size={13} aria-hidden />
                Indexes
              </h4>
              <span class="inspector-section-count">
                {props.table.indexes.length}
              </span>
            </div>

            <div class="inspector-indexes-list">
              <For each={props.table.indexes}>
                {(idx) => (
                  <div class="inspector-index-card">
                    <div class="inspector-index-top">
                      <span class="inspector-index-cols">
                        <Hash size={12} class="inspector-index-icon" aria-hidden />
                        ({idx.columns.join(", ")})
                      </span>
                      <div class="inspector-field-badges">
                        <Show when={idx.pk}>
                          <span class="inspector-badge pk">PK</span>
                        </Show>
                        <Show when={idx.unique}>
                          <span class="inspector-badge uq">UNIQUE</span>
                        </Show>
                        <Show when={idx.type}>
                          <span class="inspector-badge">{idx.type}</span>
                        </Show>
                      </div>
                    </div>
                    <Show when={idx.name}>
                      {(name) => (
                        <span class="inspector-index-name">{name()}</span>
                      )}
                    </Show>
                    <Show when={idx.note}>
                      {(note) => (
                        <p class="inspector-field-note">{note()}</p>
                      )}
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </>
  );
}
