"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import {
  cancelOrder,
  type CancelOrderInput,
  reorder,
  startPayment,
} from "@/modules/ordering";

export async function payOrder(
  orderId: string,
): Promise<ActionResult<{ paymentUrl: string | null }>> {
  return runAction(async () => {
    const result = await startPayment(await actorForAction(), orderId);
    if ("alreadyPaid" in result) {
      refresh();
      return { paymentUrl: null };
    }
    return { paymentUrl: result.authorizationUrl };
  });
}

export async function cancelOrderAction(
  orderId: string,
  input: CancelOrderInput,
): Promise<ActionResult<{ refunded: boolean }>> {
  return runAction(async () => {
    const result = await cancelOrder(await actorForAction(), orderId, input);
    refresh();
    return result;
  });
}

export async function reorderAction(orderId: string): Promise<
  ActionResult<{
    added: number;
    skipped: { productName: string; reason: string }[];
  }>
> {
  return runAction(async () => reorder(await actorForAction(), orderId));
}
