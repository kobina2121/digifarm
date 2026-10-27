import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";
import type { Actor } from "./authz";
import { db } from "./db";
import { UnauthenticatedError } from "./errors";

/**
 * The signed-in user as an {@link Actor}, or null. Reads the session cookie,
 * so call it inside a <Suspense> boundary. Deduplicated per request.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      platformRole: true,
      status: true,
      emailVerified: true,
      memberships: {
        where: { organization: { deletedAt: null } },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          role: true,
          organization: { select: { id: true, type: true } },
        },
      },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;

  const membership = user.memberships[0];
  return {
    userId: user.id,
    platformRole: user.platformRole,
    emailVerified: user.emailVerified,
    membership: membership
      ? {
          organizationId: membership.organization.id,
          organizationType: membership.organization.type,
          role: membership.role,
        }
      : null,
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    userAgent: requestHeaders.get("user-agent") ?? undefined,
  };
});

/** For pages: redirects to sign-in when there is no verified session. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  if (!actor.emailVerified) redirect("/verify-email");
  return actor;
}

/** For server actions: throws instead of redirecting. */
export async function actorForAction(): Promise<Actor> {
  const actor = await getActor();
  if (!actor || !actor.emailVerified) throw new UnauthenticatedError();
  return actor;
}

/** Where a signed-in user belongs. */
export function homePathFor(actor: Actor): string {
  if (actor.platformRole === "ADMIN" || actor.platformRole === "OPS")
    return "/admin";
  if (actor.membership?.organizationType === "BUYER") return "/buyer";
  return "/onboarding";
}
