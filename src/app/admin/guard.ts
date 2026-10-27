import "server-only";

import { redirect } from "next/navigation";

import { type Actor, isStaff } from "@/lib/authz";
import { homePathFor, requireActor } from "@/lib/session";

/** Every admin page calls this: a verified OPS or ADMIN user. */
export async function requireStaff(): Promise<Actor> {
  const actor = await requireActor();
  if (!isStaff(actor)) redirect(homePathFor(actor));
  return actor;
}
