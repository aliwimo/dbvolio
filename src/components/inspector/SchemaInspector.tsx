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
} from "lucide-react";
import { useMemo } from "react";
import { useDiagramStore } from "../../stores/diagram-store";
import { useUiStore } from "../../stores/ui-store";
import type { SchemaEnum, SchemaModel, SchemaTable } from "../../types/schema";

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
  const table = useDiagramStore((s) => s.selectedTable());
  const model = useDiagramStore((s) => s.lastValidModel);
  const selectTable = useDiagramStore((s) => s.selectTable);
  const openTableEdit = useUiStore((s) => s.openTableEdit);
  const openTableCreate = useUiStore((s) => s.openTableCreate);

  return (
    <div className="panel panel-fill inspector-panel">
      {!table ? (
        <>
          <div className="inspector-header">
            <div className="inspector-header-top">
              <div className="inspector-title-group">
                <Table2 size={14} className="inspector-panel-icon" aria-hidden />
                <span className="inspector-panel-title">Properties</span>
              </div>
              <div className="inspector-header-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost inspector-new-btn"
                  onClick={openTableCreate}
                  title="Create new table"
                >
                  <Plus size={13} aria-hidden />
                  New table
                </button>
              </div>
            </div>
          </div>
          <div className="inspector-body inspector-empty">
            <div className="inspector-empty-state">
              <Table2 size={24} className="inspector-empty-icon" aria-hidden />
              <p className="inspector-empty-title">No table selected</p>
              <p className="empty-hint">
                Select a table in the diagram to inspect its fields, relationships,
                and indexes.
              </p>
            </div>
          </div>
        </>
      ) : (
        <TableInspectorView
          table={table}
          model={model}
          onEdit={openTableEdit}
          onSelectTable={selectTable}
        />
      )}
    </div>
  );
}

function TableInspectorView({
  table,
  model,
  onEdit,
  onSelectTable,
}: {
  table: SchemaTable;
  model: SchemaModel | null;
  onEdit: () => void;
  onSelectTable: (tableId: string) => void;
}) {
  const enums = model?.enums ?? [];
  const references = model?.references ?? [];

  const outgoingRefs = useMemo(
    () => references.filter((r) => r.sourceTableId === table.id),
    [references, table.id],
  );

  const incomingRefs = useMemo(
    () =>
      references.filter(
        (r) => r.targetTableId === table.id && r.sourceTableId !== table.id,
      ),
    [references, table.id],
  );

  const fkColumnTargets = useMemo(() => {
    const map = new Map<string, { targetTableId: string; targetColumn: string }>();
    for (const ref of outgoingRefs) {
      ref.sourceColumns.forEach((colName, idx) => {
        const targetCol = ref.targetColumns[idx] ?? ref.targetColumns[0] ?? "";
        map.set(colName, {
          targetTableId: ref.targetTableId,
          targetColumn: targetCol,
        });
      });
    }
    return map;
  }, [outgoingRefs]);

  const totalRelations = outgoingRefs.length + incomingRefs.length;

  return (
    <>
      <div className="inspector-header">
        <div className="inspector-header-top">
          <div className="inspector-title-group">
            {table.headerColor && (
              <span
                className="inspector-header-color-dot"
                style={{ background: table.headerColor }}
                title={`Header color ${table.headerColor}`}
              />
            )}
            <div className="inspector-title-text">
              {table.schema && (
                <span className="inspector-schema-badge">{table.schema}</span>
              )}
              <h3 className="inspector-table-name" title={table.name}>
                {table.name}
              </h3>
            </div>
          </div>
          <div className="inspector-header-actions">
            <button
              type="button"
              className="btn btn-sm btn-ghost inspector-edit-btn"
              onClick={onEdit}
            >
              <Pencil size={13} aria-hidden />
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="inspector-body inspector-body-scroll">
        <div className="inspector-overview-section">
          <div className="inspector-meta-pills">
            <span className="inspector-meta-pill">
              {table.columns.length} {table.columns.length === 1 ? "field" : "fields"}
            </span>
            {totalRelations > 0 && (
              <span className="inspector-meta-pill">
                {totalRelations} {totalRelations === 1 ? "relation" : "relations"}
              </span>
            )}
            {table.indexes.length > 0 && (
              <span className="inspector-meta-pill">
                {table.indexes.length} {table.indexes.length === 1 ? "index" : "indexes"}
              </span>
            )}
          </div>
          {table.note && <p className="inspector-table-note">{table.note}</p>}
        </div>
        <div className="inspector-section">
          <div className="inspector-section-header">
            <h4 className="inspector-section-title">
              <Layers size={13} aria-hidden />
              Fields
            </h4>
            <span className="inspector-section-count">{table.columns.length}</span>
          </div>

          <div className="inspector-fields-list">
            {table.columns.map((col) => {
              const fkTarget = fkColumnTargets.get(col.name);
              const matchedEnum = findMatchingEnum(
                col.type,
                table.schema,
                enums,
              );
              const hasDetails =
                Boolean(col.note) ||
                Boolean(col.defaultValue) ||
                Boolean(matchedEnum) ||
                Boolean(fkTarget);

              return (
                <div key={col.name} className="inspector-field-item">
                  <div className="inspector-field-main">
                    <div className="inspector-field-name-wrap">
                      <span
                        className={`inspector-field-name ${col.isPrimaryKey ? "is-pk" : ""}`}
                        title={col.name}
                      >
                        {col.name}
                      </span>
                      <div className="inspector-field-badges">
                        {col.isPrimaryKey && (
                          <span
                            className="inspector-badge pk"
                            title="Primary key"
                          >
                            <KeyRound size={10} aria-hidden />
                            PK
                          </span>
                        )}
                        {fkTarget && (
                          <button
                            type="button"
                            className="inspector-badge fk inspector-badge-btn"
                            title={`Foreign key → ${formatTableDisplayName(fkTarget.targetTableId, model)}.${fkTarget.targetColumn}`}
                            onClick={() => onSelectTable(fkTarget.targetTableId)}
                          >
                            FK
                          </button>
                        )}
                        {!col.isNullable && !col.isPrimaryKey && (
                          <span className="inspector-badge nn" title="Not null">
                            NN
                          </span>
                        )}
                        {col.isUnique && !col.isPrimaryKey && (
                          <span className="inspector-badge uq" title="Unique">
                            UQ
                          </span>
                        )}
                        {col.isAutoIncrement && (
                          <span
                            className="inspector-badge ai"
                            title="Auto increment"
                          >
                            AI
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="inspector-field-type" title={col.type}>
                      {col.type}
                    </span>
                  </div>

                  {hasDetails && (
                    <div className="inspector-field-details">
                      {fkTarget && (
                        <div className="inspector-field-detail-row">
                          <span className="inspector-detail-label">Ref</span>
                          <button
                            type="button"
                            className="inspector-ref-link"
                            onClick={() => onSelectTable(fkTarget.targetTableId)}
                          >
                            <ArrowRight size={11} aria-hidden />
                            <span>
                              {formatTableDisplayName(
                                fkTarget.targetTableId,
                                model,
                              )}
                              .{fkTarget.targetColumn}
                            </span>
                          </button>
                        </div>
                      )}

                      {col.defaultValue !== undefined && (
                        <div className="inspector-field-detail-row">
                          <span className="inspector-detail-label">Default</span>
                          <code className="inspector-default-code">
                            {col.defaultValue}
                          </code>
                        </div>
                      )}

                      {matchedEnum && matchedEnum.values.length > 0 && (
                        <div className="inspector-field-detail-row inspector-enum-row">
                          <span className="inspector-detail-label">Values</span>
                          <div className="inspector-enum-chips">
                            {matchedEnum.values.map((val) => (
                              <span key={val} className="inspector-enum-chip">
                                {val}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {col.note && (
                        <p className="inspector-field-note">{col.note}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {totalRelations > 0 && (
          <div className="inspector-section">
            <div className="inspector-section-header">
              <h4 className="inspector-section-title">
                <Link2 size={13} aria-hidden />
                Relationships
              </h4>
              <span className="inspector-section-count">{totalRelations}</span>
            </div>

            <div className="inspector-relations-list">
              {outgoingRefs.map((ref) => {
                const targetName = formatTableDisplayName(
                  ref.targetTableId,
                  model,
                );
                return (
                  <button
                    key={`out-${ref.id}-${ref.sourceColumns.join(",")}`}
                    type="button"
                    className="inspector-relation-card"
                    onClick={() => onSelectTable(ref.targetTableId)}
                    title={`Select ${targetName}`}
                  >
                    <span className="inspector-relation-dir outgoing">
                      <ArrowRight size={12} aria-hidden />
                    </span>
                    <div className="inspector-relation-body">
                      <div className="inspector-relation-cols">
                        <span className="inspector-relation-local">
                          {ref.sourceColumns.join(", ")}
                        </span>
                        <span className="inspector-relation-arrow">→</span>
                        <span className="inspector-relation-remote">
                          {targetName}.{ref.targetColumns.join(", ")}
                        </span>
                      </div>
                      <span className="inspector-relation-subtitle">
                        References {targetName}
                      </span>
                    </div>
                  </button>
                );
              })}

              {incomingRefs.map((ref) => {
                const sourceName = formatTableDisplayName(
                  ref.sourceTableId,
                  model,
                );
                return (
                  <button
                    key={`in-${ref.id}-${ref.sourceTableId}-${ref.sourceColumns.join(",")}`}
                    type="button"
                    className="inspector-relation-card"
                    onClick={() => onSelectTable(ref.sourceTableId)}
                    title={`Select ${sourceName}`}
                  >
                    <span className="inspector-relation-dir incoming">
                      <ArrowLeft size={12} aria-hidden />
                    </span>
                    <div className="inspector-relation-body">
                      <div className="inspector-relation-cols">
                        <span className="inspector-relation-remote">
                          {sourceName}.{ref.sourceColumns.join(", ")}
                        </span>
                        <span className="inspector-relation-arrow">→</span>
                        <span className="inspector-relation-local">
                          {ref.targetColumns.join(", ")}
                        </span>
                      </div>
                      <span className="inspector-relation-subtitle">
                        Referenced by {sourceName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {table.indexes.length > 0 && (
          <div className="inspector-section">
            <div className="inspector-section-header">
              <h4 className="inspector-section-title">
                <ListChecks size={13} aria-hidden />
                Indexes
              </h4>
              <span className="inspector-section-count">
                {table.indexes.length}
              </span>
            </div>

            <div className="inspector-indexes-list">
              {table.indexes.map((idx, i) => (
                <div
                  key={idx.name ?? `${idx.columns.join("-")}-${i}`}
                  className="inspector-index-card"
                >
                  <div className="inspector-index-top">
                    <span className="inspector-index-cols">
                      <Hash size={12} className="inspector-index-icon" aria-hidden />
                      ({idx.columns.join(", ")})
                    </span>
                    <div className="inspector-field-badges">
                      {idx.pk && <span className="inspector-badge pk">PK</span>}
                      {idx.unique && (
                        <span className="inspector-badge uq">UNIQUE</span>
                      )}
                      {idx.type && (
                        <span className="inspector-badge">{idx.type}</span>
                      )}
                    </div>
                  </div>
                  {idx.name && (
                    <span className="inspector-index-name">{idx.name}</span>
                  )}
                  {idx.note && (
                    <p className="inspector-field-note">{idx.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

