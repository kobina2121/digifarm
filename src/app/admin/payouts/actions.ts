"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import { recordPayout, type RecordPayoutInput } from "@/modules/ordering";

export async function recordPayoutAction(
  fulfilmentId: string,
  input: RecordPayoutInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await recordPayout(await actorForAction(), fulfilmentId, input);
    refresh();
    return undefined;
  });
}
