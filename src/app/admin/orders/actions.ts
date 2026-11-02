"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import {
  type AssignCarrierInput,
  assignCarrier,
  type DeliveryFailedInput,
  markDelivered,
  markDeliveryFailed,
  markPickedUp,
  retryRefund,
} from "@/modules/ordering";

export async function retryRefundAction(
  refundId: string,
): Promise<ActionResult<{ status: string | null }>> {
  return runAction(async () => {
    const status = await retryRefund(await actorForAction(), refundId);
    refresh();
    return { status };
  });
}

export async function assignCarrierAction(
  fulfilmentId: string,
  input: AssignCarrierInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await assignCarrier(await actorForAction(), fulfilmentId, input);
    refresh();
    return undefined;
  });
}

export async function markPickedUpAction(
  fulfilmentId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await markPickedUp(await actorForAction(), fulfilmentId);
    refresh();
    return undefined;
  });
}

/** Multipart form: `receiverName` and an optional `photo`. */
export async function markDeliveredAction(
  fulfilmentId: string,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const file = form.get("photo");
    const photo =
      file instanceof File && file.size > 0
        ? { bytes: new Uint8Array(await file.arrayBuffer()), size: file.size }
        : undefined;
    await markDelivered(
      await actorForAction(),
      fulfilmentId,
      { receiverName: String(form.get("receiverName") ?? "") },
      photo,
    );
    refresh();
    return undefined;
  });
}

export async function markDeliveryFailedAction(
  fulfilmentId: string,
  input: DeliveryFailedInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await markDeliveryFailed(await actorForAction(), fulfilmentId, input);
    refresh();
    return undefined;
  });
}
