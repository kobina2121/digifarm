"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import { retryRefund } from "@/modules/ordering";

export async function retryRefundAction(
  refundId: string,
): Promise<ActionResult<{ status: string | null }>> {
  return runAction(async () => {
    const status = await retryRefund(await actorForAction(), refundId);
    refresh();
    return { status };
  });
}
