export function columnFromHandle(handleId: string | null | undefined): string {
  if (!handleId) {
    return "";
  }
  const idx = handleId.indexOf(":");
  return idx >= 0 ? handleId.slice(idx + 1) : handleId;
}
