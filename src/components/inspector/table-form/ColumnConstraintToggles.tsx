import type { SchemaColumn } from "../../../types/schema";

export function ColumnConstraintToggles({
  column,
  onChange,
  disabled,
  compact,
}: {
  column: SchemaColumn;
  onChange: (column: SchemaColumn) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const className = compact
    ? "table-form-constraint table-form-constraint-compact"
    : "table-form-constraint";

  return (
    <div className="table-form-constraints">
      <label className={className} title="Primary key">
        <input
          type="checkbox"
          checked={column.isPrimaryKey}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...column, isPrimaryKey: e.target.checked })
          }
        />
        <span>PK</span>
      </label>
      <label className={className} title="Not null">
        <input
          type="checkbox"
          checked={!column.isNullable}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...column, isNullable: !e.target.checked })
          }
        />
        <span>NN</span>
      </label>
      <label className={className} title="Unique">
        <input
          type="checkbox"
          checked={column.isUnique}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...column, isUnique: e.target.checked })
          }
        />
        <span>UQ</span>
      </label>
    </div>
  );
}
