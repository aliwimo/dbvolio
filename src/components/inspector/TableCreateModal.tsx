import { createSignal, createEffect, Show } from "solid-js";
import { applyCreateTable } from "../../features/schema/apply-schema-edits";
import { useDiagramStore } from "../../stores/diagram-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import type { SchemaColumn } from "../../types/schema";
import { ColumnsSection } from "./table-form/ColumnsSection";
import { defaultIdColumn } from "./table-form/column-defaults";
import { TableFormDialog } from "./table-form/TableFormDialog";
import { TableMetaCard } from "./table-form/TableMetaCard";
import { Button } from "../ui";

export function TableCreateModal() {
  const open = () => useUiStore((s) => s.tableCreateOpen);
  const closeTableCreate = useUiStore.getState().closeTableCreate;
  const files = () => useProjectStore((s) => s.files);
  const entryPoint = () => useProjectStore((s) => s.entryPoint);
  const selectTable = useDiagramStore.getState().selectTable;

  const dbmlFiles = () =>
    files().filter((f) => !f.isDirectory && f.relativePath.endsWith(".dbml"));
  const dbmlPaths = () => dbmlFiles().map((f) => f.relativePath);

  const [tableName, setTableName] = createSignal("");
  const [tableSchema, setTableSchema] = createSignal("");
  const [headerColor, setHeaderColor] = createSignal("");
  const [targetFile, setTargetFile] = createSignal("");
  const [columns, setColumns] = createSignal<SchemaColumn[]>([defaultIdColumn()]);
  const [columnError, setColumnError] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  createEffect(() => {
    if (open()) {
      setTableName("");
      setTableSchema("");
      setHeaderColor("");
      setTargetFile(entryPoint() ?? dbmlFiles()[0]?.relativePath ?? "");
      setColumns([defaultIdColumn()]);
      setColumnError(null);
      setError(null);
      setBusy(false);
    }
  });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const trimmedName = tableName().trim();
    if (!trimmedName) {
      setError("Table name is required.");
      return;
    }
    if (!targetFile()) {
      setError("Choose a DBML file to save the new table.");
      return;
    }
    if (columns().length === 0) {
      setError("Add at least one field.");
      return;
    }
    const invalidCol = columns().find((c) => !c.name.trim());
    if (invalidCol) {
      setError("Every field needs a name.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const schema = tableSchema().trim() || undefined;
      await applyCreateTable(
        targetFile(),
        {
          schema,
          name: trimmedName,
          headerColor: headerColor().trim() || undefined,
          columns: columns(),
        },
        files()
      );
      const tableId = schema ? `${schema}.${trimmedName}` : trimmedName;
      selectTable(tableId);
      closeTableCreate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableFormDialog
      open={open()}
      onClose={closeTableCreate}
      titleId="table-create-modal-title"
      title="Create table"
      subtitle="Creates a table definition and appends it to your selected DBML file"
      footer={
        <>
          <Button variant="outline" onClick={closeTableCreate} disabled={busy()}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="table-create-form"
            disabled={busy() || !tableName().trim()}
          >
            {busy() ? "Creating…" : "Create table"}
          </Button>
        </>
      }
    >
      <form id="table-create-form" onSubmit={handleSubmit}>
        <TableMetaCard
          schema={tableSchema()}
          name={tableName()}
          onSchemaChange={setTableSchema}
          onNameChange={setTableName}
          headerColor={headerColor()}
          onHeaderColorChange={setHeaderColor}
          targetFile={targetFile()}
          onTargetFileChange={setTargetFile}
          dbmlFilePaths={dbmlPaths()}
          disabled={busy()}
          nameAutoFocus
        />

        <div style={{ height: "16px" }} />

        <ColumnsSection
          mode="draft"
          columns={columns()}
          onChange={setColumns}
          disabled={busy()}
          error={columnError()}
          onError={setColumnError}
        />

        <Show when={error()}>
          <p class="form-error" role="alert">
            {error()}
          </p>
        </Show>
      </form>
    </TableFormDialog>
  );
}
