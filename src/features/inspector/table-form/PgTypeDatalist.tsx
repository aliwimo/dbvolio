import { For } from "solid-js";
import { PG_TYPES, PG_TYPES_DATALIST_ID } from "./constants";

export function PgTypeDatalist() {
  return (
    <datalist id={PG_TYPES_DATALIST_ID}>
      <For each={PG_TYPES}>
        {(type) => <option value={type} />}
      </For>
    </datalist>
  );
}
