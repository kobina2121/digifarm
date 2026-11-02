"use server";

import { headers } from "next/headers";

import { type ActionResult, runAction } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { actorForAction } from "@/lib/session";
import { deleteAccount } from "@/modules/buyers";
import type { DeleteAccountInput } from "@/modules/buyers/schemas";

export async function deleteMyAccount(
  input: DeleteAccountInput,
): Promise<ActionResult> {
  return runAction(async () => {
    await deleteAccount(await actorForAction(), input);
    // The session is gone from the database; this clears its cookies too.
    await auth.api.signOut({ headers: await headers() });
    return undefined;
  });
}
