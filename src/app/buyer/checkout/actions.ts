"use server";

import { type ActionResult, runAction } from "@/lib/action-result";
import { AppError, isAppError } from "@/lib/errors";
import { actorForAction } from "@/lib/session";
import { checkout, type CheckoutInput, startPayment } from "@/modules/ordering";
import { PAYMENTS_OFF_MESSAGE, paymentsEnabled } from "@/modules/payments";

/**
 * Place the order (holding its stock), then start payment. If the payment
 * service can't be reached, the order still exists and the buyer can pay from
 * its page while the hold lasts.
 */
export async function placeOrderAndPay(input: CheckoutInput): Promise<
  ActionResult<{
    orderId: string;
    paymentUrl: string | null;
    paymentError: string | null;
  }>
> {
  return runAction(async () => {
    const actor = await actorForAction();
    // Refuse before placing the order, so no stock is held for it.
    if (!paymentsEnabled()) {
      throw new AppError(PAYMENTS_OFF_MESSAGE, "PAYMENTS_OFF", 503);
    }
    const order = await checkout(actor, input);
    try {
      const payment = await startPayment(actor, order.id);
      return {
        orderId: order.id,
        paymentUrl:
          "authorizationUrl" in payment ? payment.authorizationUrl : null,
        paymentError: null,
      };
    } catch (error) {
      if (!isAppError(error)) throw error;
      return {
        orderId: order.id,
        paymentUrl: null,
        paymentError: error.message,
      };
    }
  });
}
