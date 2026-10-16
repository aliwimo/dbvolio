import { PG_TYPES, PG_TYPES_DATALIST_ID } from "./constants";

export function PgTypeDatalist() {
  return (
    <datalist id={PG_TYPES_DATALIST_ID}>
      {PG_TYPES.map((t) => (
        <option key={t} value={t} />
      ))}
    </datalist>
  );
}
