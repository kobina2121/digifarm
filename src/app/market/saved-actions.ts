"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import { setListingSaved } from "@/modules/catalog";

export async function saveListing(
  listingId: string,
  saved: boolean,
): Promise<ActionResult<{ saved: boolean }>> {
  return runAction(async () => {
    const result = await setListingSaved(
      await actorForAction(),
      listingId,
      saved,
    );
    refresh();
    return result;
  });
}
