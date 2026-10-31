/** "Stock updated 3 hours ago" — when staff last set this listing’s stock. */
export function formatStockAge(confirmedAt: Date | null, now: Date): string {
  if (!confirmedAt) return "Stock never updated";
  const hours = Math.floor((now.getTime() - confirmedAt.getTime()) / 3_600_000);
  if (hours < 1) return "Stock updated just now";
  if (hours < 24)
    return `Stock updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Stock updated ${days} day${days === 1 ? "" : "s"} ago`;
}
