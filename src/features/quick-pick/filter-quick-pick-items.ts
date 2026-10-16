export function quickPickMatchesQuery(haystack: string, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return true;
  }
  const lower = haystack.toLowerCase();
  return tokens.every((token) => lower.includes(token));
}
