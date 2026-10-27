"use server";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import {
  type BuyerOnboardingInput,
  createBuyerOrganization,
} from "@/modules/buyers";

export async function onboardBuyer(
  input: BuyerOnboardingInput,
): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await actorForAction();
    await createBuyerOrganization(actor, input);
    return undefined;
  });
}
