"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import {
  addDeliveryAddress,
  type DeliveryAddressInput,
  removeDeliveryAddress,
} from "@/modules/buyers";

export async function addAddress(
  input: DeliveryAddressInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await addDeliveryAddress(await actorForAction(), input);
    refresh();
    return undefined;
  });
}

export async function removeAddress(addressId: string): Promise<ActionResult> {
  return runAction(async () => {
    await removeDeliveryAddress(await actorForAction(), addressId);
    refresh();
    return undefined;
  });
}
