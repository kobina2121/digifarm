import { logger } from "@/lib/logger";
import { expireUnpaidOrders } from "@/modules/ordering";

import { cronAuthorized } from "../authorize";

/** Ends payment holds that ran out, putting their stock back on sale. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await expireUnpaidOrders(new Date(), { limit: 200 });
  if (result.expired || result.paid)
    logger.info(result, "Expired unpaid orders");
  return Response.json(result);
}
