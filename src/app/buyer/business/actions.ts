"use server";

import { refresh } from "next/cache";

import { type ActionResult, runAction } from "@/lib/action-result";
import { actorForAction } from "@/lib/session";
import {
  type BusinessDetailsInput,
  updateBusinessDetails,
} from "@/modules/buyers";

export async function saveBusinessDetails(
  input: BusinessDetailsInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await updateBusinessDetails(await actorForAction(), input);
    refresh();
    return undefined;
  });
}
