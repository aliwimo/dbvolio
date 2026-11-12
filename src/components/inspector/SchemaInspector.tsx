import {
  ArrowLeft,
  ArrowRight,
  Hash,
  Link2,
  Pencil,
  Plus,
  Table2,
} from "lucide-solid";
import { For, Show } from "solid-js";
import { resolveGroupColor } from "../diagram/TableGroupNode";
import { useDiagramStore } from "../../stores/diagram-store";
import { useUiStore } from "../../stores/ui-store";
import type { SchemaEnum, SchemaModel } from "../../types/schema";

function findMatchingEnum(
  colType: string,
  tableSchema: string | undefined,
  enums: SchemaEnum[]
): SchemaEnum | undefined {
  if (enums.length === 0) return undefined;
  const normalized = colType.trim();
  return enums.find((e) => {
    const enumFull = e.schema ? `${e.schema}.${e.name}` : e.name;
    if (normalized === enumFull || normalized === e.id) return true;
    const effectiveTableSchema = tableSchema || "public";
    const effectiveEnumSchema = e.schema || "public";
    return (
      normalized === e.name && effectiveTableSchema === effectiveEnumSchema
    );
  });
}

function formatTableDisplayName(
  tableId: string,
  model: SchemaModel | null
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

  const group = () => {
    const t = table();
    const m = model();
    if (!t || !m || !t.groupId) return null;
    return m.tableGroups?.find((g) => g.id === t.groupId) ?? null;
  };

  const incomingRefs = () => {
    const t = table();
    const m = model();
    if (!t || !m) return [];
    return m.references.filter((r) => r.targetTableId === t.id);
  };

  const outgoingRefs = () => {
    const t = table();
    const m = model();
    if (!t || !m) return [];
    return m.references.filter((r) => r.sourceTableId === t.id);
  };

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
            <div class="inspector-empty">
              <Table2 size={24} class="inspector-empty-icon" aria-hidden />
              <p class="inspector-empty-title">No table selected</p>
              <p class="inspector-empty-hint">
                Click any table in the diagram or explorer to inspect its columns,
                constraints, and relationships.
              </p>
            </div>
          </>
        }
      >
        {(t) => (
          <>
            <div class="inspector-header">
              <div class="inspector-header-top">
                <div class="inspector-title-group">
                  <span
                    class="inspector-title-swatch"
                    style={{
                      background: t().headerColor || "var(--color-accent)",
                    }}
                    aria-hidden
                  />
                  <h2 class="inspector-title" title={t().name}>
                    {t().name}
                  </h2>
                </div>
                <div class="inspector-header-actions">
                  <button
                    type="button"
                    class="btn-icon"
                    onClick={openTableEdit}
                    title="Edit table"
                    aria-label="Edit table"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    class="btn-icon"
                    onClick={openTableCreate}
                    title="Create new table"
                    aria-label="Create new table"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <Show when={t().schema || group()}>
                <div class="inspector-badges">
                  <Show when={t().schema}>
                    <span class="inspector-badge inspector-badge-schema">
                      {t().schema}
                    </span>
                  </Show>
                  <Show when={group()}>
                    {(g) => (
                      <span
                        class="inspector-badge inspector-badge-group"
                        style={{
                          "--group-color": resolveGroupColor(g()),
                        }}
                      >
                        <span
                          class="inspector-badge-dot"
                          style={{ background: resolveGroupColor(g()) }}
                          aria-hidden
                        />
                        {g().name}
                      </span>
                    )}
                  </Show>
                </div>
              </Show>
            </div>

            <div class="inspector-body inspector-body-scroll">
              <section class="inspector-section">
                <h3 class="inspector-section-title">
                  <Hash size={13} aria-hidden />
                  Columns ({t().columns.length})
                </h3>
                <div class="inspector-columns-list">
                  <For each={t().columns}>
                    {(col) => {
                      const enumMatch = () =>
                        findMatchingEnum(col.type, t().schema, model()?.enums ?? []);

                      return (
                        <div class="inspector-column-row">
                          <div class="inspector-column-main">
                            <span class="inspector-column-name">{col.name}</span>
                            <div class="inspector-column-badges">
                              <Show when={col.isPrimaryKey}>
                                <span class="badge pk">PK</span>
                              </Show>
                              <Show when={col.isUnique && !col.isPrimaryKey}>
                                <span class="badge">UQ</span>
                              </Show>
                              <Show when={!col.isNullable}>
                                <span class="badge">NN</span>
                              </Show>
                              <Show when={col.isAutoIncrement}>
                                <span class="badge">INC</span>
                              </Show>
                            </div>
                          </div>
                          <span class="inspector-column-type" title={col.type}>
                            {col.type}
                          </span>
                          <Show when={enumMatch()}>
                            {(e) => (
                              <div class="inspector-enum-details">
                                <span class="inspector-enum-label">
                                  Enum values:
                                </span>
                                <span class="inspector-enum-values">
                                  {e().values.join(", ")}
                                </span>
                              </div>
                            )}
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </section>

              <Show when={incomingRefs().length > 0 || outgoingRefs().length > 0}>
                <section class="inspector-section">
                  <h3 class="inspector-section-title">
                    <Link2 size={13} aria-hidden />
                    Relationships ({incomingRefs().length + outgoingRefs().length})
                  </h3>
                  <div class="inspector-refs-list">
                    <For each={incomingRefs()}>
                      {(ref) => (
                        <div
                          class="inspector-ref-item"
                          onClick={() => selectTable(ref.sourceTableId)}
                        >
                          <ArrowLeft size={13} class="inspector-ref-icon" />
                          <span>
                            From{" "}
                            <strong>
                              {formatTableDisplayName(ref.sourceTableId, model())}
                            </strong>
                            ({ref.sourceColumns.join(", ")})
                          </span>
                        </div>
                      )}
                    </For>
                    <For each={outgoingRefs()}>
                      {(ref) => (
                        <div
                          class="inspector-ref-item"
                          onClick={() => selectTable(ref.targetTableId)}
                        >
                          <ArrowRight size={13} class="inspector-ref-icon" />
                          <span>
                            To{" "}
                            <strong>
                              {formatTableDisplayName(ref.targetTableId, model())}
                            </strong>
                            ({ref.targetColumns.join(", ")})
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </section>
              </Show>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}
