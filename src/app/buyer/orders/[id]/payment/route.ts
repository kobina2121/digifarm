import { type NextRequest, NextResponse } from "next/server";

import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getActor } from "@/lib/session";
import { confirmPayment, getOrderForBuyer } from "@/modules/ordering";

/**
 * Where the payment provider sends the buyer back. We never trust the
 * redirect itself: we ask the provider what happened, then show the order.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/buyer/orders/[id]/payment">,
) {
  const { id } = await params;
  const orderUrl = new URL(`/buyer/orders/${id}`, request.url);
  const actor = await getActor();
  if (!actor) return NextResponse.redirect(new URL("/sign-in", request.url));

  const reference =
    request.nextUrl.searchParams.get("reference") ??
    request.nextUrl.searchParams.get("trxref");
  try {
    // Only for the buyer's own order (throws "not found" otherwise).
    await getOrderForBuyer(actor, id);
    if (reference) {
      const { outcome, orderId } = await confirmPayment(reference);
      if (orderId === id) orderUrl.searchParams.set("payment", outcome);
    }
  } catch (error) {
    if (!isAppError(error)) {
      logger.error({ err: error, orderId: id }, "Payment return failed");
    }
    orderUrl.searchParams.set("payment", "unavailable");
  }
  return NextResponse.redirect(orderUrl, { status: 303 });
}
