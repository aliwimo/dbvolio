import { createSignal, createEffect, Show } from "solid-js";
import {
  applyAddColumn,
  applyMoveColumn,
  applyRemoveColumn,
  applyUpdateColumn,
  applySetTableHeaderColor,
  applyUpdateTableMeta,
  openTableSourceFile,
} from "../schema/apply-schema-edits";
import { useDiagramStore } from "../diagram/diagram-store";
import { useProjectStore } from "../projects/project-store";
import { useUiStore } from "../../shared/stores/ui-store";
import { ColumnsSection } from "./table-form/ColumnsSection";
import { TableFormDialog } from "./table-form/TableFormDialog";
import { TableMetaCard } from "./table-form/TableMetaCard";
import { Button } from "../../shared/ui";

export function TableEditModal() {
  const open = () => useUiStore((s) => s.tableEditOpen);
  const closeTableEdit = useUiStore.getState().closeTableEdit;
  const table = () => useDiagramStore((s) => s.selectedTable());
  const files = () => useProjectStore((s) => s.files);

  const [tableName, setTableName] = createSignal("");
  const [tableSchema, setTableSchema] = createSignal("");
  const [headerColor, setHeaderColor] = createSignal("");
  const [columnError, setColumnError] = createSignal<string | null>(null);
  const [editError, setEditError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  createEffect(() => {
    const t = table();
    if (open() && t) {
      setTableName(t.name);
      setTableSchema(t.schema ?? "");
      setHeaderColor(t.headerColor ?? "");
      setColumnError(null);
      setEditError(null);
    } else if (open() && !t) {
      closeTableEdit();
    }
  });

  const metaDirty = () => {
    const t = table();
    if (!t) return false;
    const nextSchema = tableSchema().trim();
    const prevSchema = (t.schema ?? "").trim();
    return tableName().trim() !== t.name || nextSchema !== prevSchema;
  };

  const runEdit = async (action: () => Promise<boolean>) => {
    setBusy(true);
    setEditError(null);
    try {
      const ok = await action();
      if (!ok) {
        setEditError(
          "Could not find this table in project DBML files. Open or create the table definition first."
        );
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const saveMeta = () => {
    const t = table();
    if (!t || !metaDirty()) return;
    const nextName = tableName().trim();
    if (!nextName) {
      setEditError("Table name cannot be empty.");
      return;
    }
    const nextSchema = tableSchema().trim() || undefined;
    void runEdit(async () => {
      const ok = await applyUpdateTableMeta(
        t,
        { schema: nextSchema, name: nextName },
        files()
      );
      if (ok) {
        const nextId = nextSchema ? `${nextSchema}.${nextName}` : nextName;
        useDiagramStore.getState().selectTable(nextId);
      }
      return ok;
    });
  };

  const handleColorChange = (color: string) => {
    setHeaderColor(color);
    const t = table();
    if (!t) return;
    void runEdit(() => applySetTableHeaderColor(t, color, files()));
  };

  return (
    <Show when={open() && table()}>
      {(t) => (
        <TableFormDialog
          open={open()}
          onClose={closeTableEdit}
          titleId="table-edit-modal-title"
          title={`Edit ${t().name}`}
          subtitle="Modifications update the underlying DBML file immediately"
          footer={
            <>
              <Button variant="outline" onClick={closeTableEdit} disabled={busy()}>
                Close
              </Button>
              <Button
                variant="secondary"
                disabled={busy()}
                onClick={() => {
                  void openTableSourceFile(t(), files());
                  closeTableEdit();
                }}
              >
                Open in editor
              </Button>
            </>
          }
        >
          <div>
            <TableMetaCard
              schema={tableSchema()}
              name={tableName()}
              onSchemaChange={setTableSchema}
              onNameChange={setTableName}
              headerColor={headerColor()}
              onHeaderColorChange={handleColorChange}
              disabled={busy()}
              actions={
                <Show when={metaDirty()}>
                  <Button
                    size="sm"
                    disabled={busy() || !tableName().trim()}
                    onClick={saveMeta}
                  >
                    Save name &amp; schema
                  </Button>
                </Show>
              }
            />

            <div style={{ height: "16px" }} />

            <ColumnsSection
              mode="live"
              columns={t().columns}
              disabled={busy()}
              error={columnError()}
              onError={setColumnError}
              onAdd={(col, placement) =>
                void runEdit(() => applyAddColumn(t(), col, files(), placement))
              }
              onUpdate={(orig, next) =>
                void runEdit(() => applyUpdateColumn(t(), orig, next, files()))
              }
              onRemove={(colName) =>
                void runEdit(() => applyRemoveColumn(t(), colName, files()))
              }
              onMove={(colName, dir) =>
                void runEdit(() => applyMoveColumn(t(), colName, dir, files()))
              }
            />

            <Show when={editError()}>
              <p class="form-error" role="alert">
                {editError()}
              </p>
            </Show>
          </div>
        </TableFormDialog>
      )}
    </Show>
  );
}
