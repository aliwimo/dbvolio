import { useCallback, useEffect, useMemo, useState } from "react";
import { applyCreateTable } from "../../features/schema/apply-schema-edits";
import { useDiagramStore } from "../../stores/diagram-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import type { SchemaColumn } from "../../types/schema";
import { ColumnsSection } from "./table-form/ColumnsSection";
import { defaultIdColumn } from "./table-form/column-defaults";
import { TableFormDialog } from "./table-form/TableFormDialog";
import { TableMetaCard } from "./table-form/TableMetaCard";

export function TableCreateModal() {
  const open = useUiStore((s) => s.tableCreateOpen);
  const closeTableCreate = useUiStore((s) => s.closeTableCreate);
  const files = useProjectStore((s) => s.files);
  const entryPoint = useProjectStore((s) => s.entryPoint);
  const selectTable = useDiagramStore((s) => s.selectTable);

  const dbmlFiles = useMemo(
    () =>
      files.filter(
        (f) => !f.isDirectory && f.relativePath.endsWith(".dbml"),
      ),
    [files],
  );
  const dbmlPaths = useMemo(
    () => dbmlFiles.map((f) => f.relativePath),
    [dbmlFiles],
  );

  const [tableName, setTableName] = useState("");
  const [tableSchema, setTableSchema] = useState("");
  const [headerColor, setHeaderColor] = useState("");
  const [targetFile, setTargetFile] = useState("");
  const [columns, setColumns] = useState<SchemaColumn[]>([defaultIdColumn()]);
  const [columnError, setColumnError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTableName("");
      setTableSchema("");
      setHeaderColor("");
      setTargetFile(entryPoint ?? dbmlFiles[0]?.relativePath ?? "");
      setColumns([defaultIdColumn()]);
      setColumnError(null);
      setError(null);
      setBusy(false);
    }
  }, [open, entryPoint, dbmlFiles]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = tableName.trim();
      if (!trimmedName) {
        setError("Table name is required.");
        return;
      }
      if (!targetFile) {
        setError("Choose a DBML file to save the new table.");
        return;
      }
      if (columns.length === 0) {
        setError("Add at least one field.");
        return;
      }
      const invalidCol = columns.find((c) => !c.name.trim());
      if (invalidCol) {
        setError("Every field needs a name.");
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
            columns: columns.map((c) => ({
              ...c,
              name: c.name.trim(),
              type: c.type.trim() || "varchar",
            })),
          },
          files,
        );

        const newTableId = schema
          ? `${schema}.${trimmedName}`
          : `public.${trimmedName}`;
        selectTable(newTableId);
        closeTableCreate();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [
      tableName,
      tableSchema,
      headerColor,
      targetFile,
      columns,
      files,
      selectTable,
      closeTableCreate,
    ],
  );

  const canSubmit =
    !busy &&
    Boolean(tableName.trim()) &&
    Boolean(targetFile) &&
    columns.length > 0 &&
    columns.every((c) => c.name.trim());

  return (
    <TableFormDialog
      open={open}
      onClose={closeTableCreate}
      titleId="table-create-title"
      title="New table"
      subtitle="Set the table identity and fields, then save to DBML."
      footer={
        <>
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
            form="table-create-form"
            className="btn btn-sm btn-primary"
            disabled={!canSubmit}
          >
            {busy ? "Creating…" : "Create table"}
          </button>
        </>
      }
    >
      <form id="table-create-form" onSubmit={handleSubmit}>
        <TableMetaCard
          schema={tableSchema}
          name={tableName}
          onSchemaChange={setTableSchema}
          onNameChange={setTableName}
          headerColor={headerColor}
          onHeaderColorChange={setHeaderColor}
          targetFile={targetFile}
          onTargetFileChange={setTargetFile}
          dbmlFilePaths={dbmlPaths}
          disabled={busy}
          nameAutoFocus
        />

        <ColumnsSection
          mode="draft"
          columns={columns}
          onChange={setColumns}
          disabled={busy}
          error={columnError}
          onError={setColumnError}
        />

        {error && <p className="inspector-error table-form-form-error">{error}</p>}
      </form>
    </TableFormDialog>
  );
}
