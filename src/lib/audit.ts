import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import type { Actor } from "./authz";
import type { Tx } from "./db";

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  onBehalfOfOrgId?: string;
};

/**
 * Record an audit entry inside the same transaction as the change it describes,
 * so a change is never saved without its audit row (or vice versa).
 */
export async function audit(tx: Tx, actor: Actor | null, entry: AuditEntry) {
  await tx.auditLog.create({
    data: {
      actorUserId: actor?.userId ?? null,
      actorRole: actor?.platformRole ?? "SYSTEM",
      onBehalfOfOrgId: entry.onBehalfOfOrgId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    },
  });
}
