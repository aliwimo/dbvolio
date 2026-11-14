import type { SchemaColumn } from "../../schema/schema";
import { Checkbox } from "../../../shared/ui";

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
    <div class="table-form-constraints">
      <label class={className} title="Primary key">
        <Checkbox
          checked={column.isPrimaryKey}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...column, isPrimaryKey: e.target.checked })
          }
        />
        <span>PK</span>
      </label>
      <label class={className} title="Not null">
        <Checkbox
          checked={!column.isNullable}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...column, isNullable: !e.target.checked })
          }
        />
        <span>NN</span>
      </label>
      <label class={className} title="Unique">
        <Checkbox
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
