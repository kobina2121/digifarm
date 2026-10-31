"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import { setCartItem } from "@/modules/ordering";

export async function addToCart(
  listingId: string,
  quantity: string,
): Promise<ActionResult<{ quantityLabel: string }>> {
  return runAction(async () => {
    const result = await setCartItem(await actorForAction(), {
      listingId,
      quantity,
      mode: "add",
    });
    refresh();
    return { quantityLabel: result.quantityLabel };
  });
}
