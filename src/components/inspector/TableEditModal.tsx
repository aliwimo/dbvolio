import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyAddColumn,
  applyMoveColumn,
  applyRemoveColumn,
  applyUpdateColumn,
  applySetTableHeaderColor,
  applyUpdateTableMeta,
  openTableSourceFile,
} from "../../features/schema/apply-schema-edits";
import { useDiagramStore } from "../../stores/diagram-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";
import { ColumnsSection } from "./table-form/ColumnsSection";
import { TableFormDialog } from "./table-form/TableFormDialog";
import { TableMetaCard } from "./table-form/TableMetaCard";

export function TableEditModal() {
  const open = useUiStore((s) => s.tableEditOpen);
  const closeTableEdit = useUiStore((s) => s.closeTableEdit);
  const table = useDiagramStore((s) => s.selectedTable());
  const files = useProjectStore((s) => s.files);
  const projectFiles = useMemo(
    () => files.filter((f) => !f.isDirectory),
    [files],
  );

  const [tableName, setTableName] = useState("");
  const [tableSchema, setTableSchema] = useState("");
  const [headerColor, setHeaderColor] = useState("");
  const [columnError, setColumnError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !table) {
      return;
    }
    setTableName(table.name);
    setTableSchema(table.schema ?? "");
    setHeaderColor(table.headerColor ?? "");
    setColumnError(null);
    setEditError(null);
  }, [open, table]);

  useEffect(() => {
    if (open && !table) {
      closeTableEdit();
    }
  }, [open, table, closeTableEdit]);

  const metaDirty = useMemo(() => {
    if (!table) {
      return false;
    }
    const nextSchema = tableSchema.trim();
    const prevSchema = (table.schema ?? "").trim();
    return tableName.trim() !== table.name || nextSchema !== prevSchema;
  }, [table, tableName, tableSchema]);

  const runEdit = useCallback(async (action: () => Promise<boolean>) => {
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
  }, []);

  if (!open || !table) {
    return null;
  }

  return (
    <TableFormDialog
      open={open}
      onClose={closeTableEdit}
      titleId="table-edit-title"
      title="Edit table"
      footer={
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={closeTableEdit}
        >
          Done
        </button>
      }
    >
      <TableMetaCard
        schema={tableSchema}
        name={tableName}
        onSchemaChange={setTableSchema}
        onNameChange={setTableName}
        headerColor={headerColor}
        onHeaderColorChange={(color) => {
          setHeaderColor(color);
          void runEdit(() =>
            applySetTableHeaderColor(table, color || null, projectFiles),
          );
        }}
        disabled={busy}
        actions={
          <>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={() => void openTableSourceFile(table, projectFiles)}
            >
              Open source
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busy || !metaDirty || !tableName.trim()}
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
              Save definition
            </button>
          </>
        }
      />

      <ColumnsSection
        mode="live"
        columns={table.columns}
        disabled={busy}
        error={columnError}
        onError={setColumnError}
        onUpdate={(originalName, next) =>
          void runEdit(() =>
            applyUpdateColumn(table, originalName, next, projectFiles),
          )
        }
        onRemove={(name) =>
          void runEdit(() => applyRemoveColumn(table, name, projectFiles))
        }
        onMove={(name, direction) =>
          void runEdit(() =>
            applyMoveColumn(table, name, direction, projectFiles),
          )
        }
        onAdd={(column, placement) =>
          void runEdit(() =>
            applyAddColumn(table, column, projectFiles, placement),
          )
        }
      />

      {editError && (
        <p className="inspector-error table-form-form-error">{editError}</p>
      )}
    </TableFormDialog>
  );
}
