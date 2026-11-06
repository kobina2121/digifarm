import { logger } from "@/lib/logger";
import { reconcilePayments } from "@/modules/ordering";

import { cronAuthorized } from "../authorize";

/** Daily: compares yesterday's payments at the provider with Akuafo's records. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const report = await reconcilePayments(null, { from, to });
  if (report.issues.length) {
    logger.warn(
      { issues: report.issues, from, to },
      "Payment reconciliation found differences",
    );
  }
  return Response.json({
    from,
    to,
    providerCount: report.providerCount,
    digifarmCount: report.digifarmCount,
    issues: report.issues.length,
  });
}
