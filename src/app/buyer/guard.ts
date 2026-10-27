import "server-only";

import { redirect } from "next/navigation";

import type { Actor } from "@/lib/authz";
import { homePathFor, requireActor } from "@/lib/session";

/** Every buyer page calls this: signed in, verified, and a member of a buyer business. */
export async function requireBuyer(): Promise<Actor> {
  const actor = await requireActor();
  if (actor.membership?.organizationType !== "BUYER")
    redirect(homePathFor(actor));
  return actor;
}
