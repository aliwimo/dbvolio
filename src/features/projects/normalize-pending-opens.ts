import type { DbmlOpenPayload } from "../../services/tauri-bridge";

/** Prefer explicit file opens over folder opens for the same project root. */
export function normalizePendingOpens(
  payloads: DbmlOpenPayload[],
): DbmlOpenPayload[] {
  const byRoot = new Map<string, DbmlOpenPayload>();
  for (const payload of payloads) {
    const existing = byRoot.get(payload.projectRoot);
    if (!existing) {
      byRoot.set(payload.projectRoot, payload);
      continue;
    }
    if (payload.relativePath && !existing.relativePath) {
      byRoot.set(payload.projectRoot, payload);
    }
  }
  return [...byRoot.values()];
}
