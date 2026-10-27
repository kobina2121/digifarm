import { randomUUID } from "node:crypto";

import type { PlatformRole } from "@/generated/prisma/enums";
import type { Actor } from "@/lib/authz";
import { db } from "@/lib/db";

/** Creates a real user row (verified by default) and the matching Actor. */
export async function createUser(
  opts: {
    platformRole?: PlatformRole;
    emailVerified?: boolean;
    name?: string;
  } = {},
): Promise<Actor> {
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      name: opts.name ?? "Test User",
      email: `test-${id}@example.test`,
      emailVerified: opts.emailVerified ?? true,
      platformRole: opts.platformRole ?? "USER",
    },
  });
  return {
    userId: id,
    platformRole: opts.platformRole ?? "USER",
    emailVerified: opts.emailVerified ?? true,
    membership: null,
  };
}
