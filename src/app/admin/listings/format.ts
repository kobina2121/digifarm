/** "Stock checked 3 hours ago" — how fresh the last call to the farmer is. */
export function formatStockAge(confirmedAt: Date | null, now: Date): string {
  if (!confirmedAt) return "Stock never checked";
  const hours = Math.floor((now.getTime() - confirmedAt.getTime()) / 3_600_000);
  if (hours < 1) return "Stock checked just now";
  if (hours < 24)
    return `Stock checked ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Stock checked ${days} day${days === 1 ? "" : "s"} ago`;
}
