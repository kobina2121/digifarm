"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import { removeCartItem, setCartItem } from "@/modules/ordering";

export async function updateCartLine(
  listingId: string,
  quantity: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await setCartItem(await actorForAction(), {
      listingId,
      quantity,
      mode: "set",
    });
    refresh();
    return undefined;
  });
}

export async function removeCartLine(listingId: string): Promise<ActionResult> {
  return runAction(async () => {
    await removeCartItem(await actorForAction(), listingId);
    refresh();
    return undefined;
  });
}
