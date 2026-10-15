import { Pencil } from "lucide-react";
import { openTableSourceFile } from "../../features/schema/apply-schema-edits";
import { useDiagramStore } from "../../stores/diagram-store";
import { useProjectStore } from "../../stores/project-store";
import { useUiStore } from "../../stores/ui-store";

export function SchemaInspector() {
  const table = useDiagramStore((s) => s.selectedTable());
  const files = useProjectStore((s) => s.files);
  const projectFiles = files.filter((f) => !f.isDirectory);
  const openTableEdit = useUiStore((s) => s.openTableEdit);

  return (
    <div className="panel panel-fill inspector-panel">
      {!table && (
        <div className="inspector-body inspector-empty">
          <p className="empty-hint">
            Select a table in the diagram to view its properties.
          </p>
        </div>
      )}

      {table && (
        <div className="inspector-body inspector-body-scroll">
          <div className="inspector-section inspector-section-header-row">
            <div>
              <h3 className="inspector-table-name">
                {table.schema ? `${table.schema}.` : ""}
                {table.name}
              </h3>
              {table.headerColor && (
                <span
                  className="inspector-header-color-badge"
                  style={{ background: table.headerColor }}
                  title={`Header color ${table.headerColor}`}
                />
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={openTableEdit}
            >
              <Pencil size={14} aria-hidden />
              Edit
            </button>
          </div>

          <div className="inspector-section">
            <h3 className="inspector-section-title">Fields</h3>
            <table className="inspector-columns">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>PK</th>
                  <th>NN</th>
                  <th>UQ</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col) => (
                  <tr key={col.name}>
                    <td>{col.name}</td>
                    <td>{col.type}</td>
                    <td>{col.isPrimaryKey ? "✓" : ""}</td>
                    <td>{!col.isNullable ? "✓" : ""}</td>
                    <td>{col.isUnique ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {table.indexes.length > 0 && (
            <div className="inspector-section">
              <h3 className="inspector-section-title">Indexes</h3>
              <ul className="inspector-list">
                {table.indexes.map((idx, i) => (
                  <li key={idx.name ?? i}>
                    {idx.name ?? "(unnamed)"}: {idx.columns.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="inspector-actions">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => void openTableSourceFile(table, projectFiles)}
            >
              Open source
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
