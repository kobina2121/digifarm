import type {
  MembershipRole,
  OrganizationType,
  PlatformRole,
} from "@/generated/prisma/enums";

import { ForbiddenError } from "./errors";

/** Who is acting. Every service function receives one (ROADMAP §2.4). */
export type Actor = {
  userId: string;
  platformRole: PlatformRole;
  emailVerified: boolean;
  /** The user's organization, if they belong to one (one per user in the MVP). */
  membership: {
    organizationId: string;
    organizationType: OrganizationType;
    role: MembershipRole;
  } | null;
  ipAddress?: string;
  userAgent?: string;
};

export type Permission =
  | "buyer.onboard"
  | "buyer.profile.read"
  | "buyer.profile.update"
  | "buyer.address.manage"
  | "supplier.create"
  | "supplier.read"
  | "supplier.update"
  | "farmVisit.record"
  | "farmVisit.photo.read"
  | "verification.decide"
  | "listing.manage"
  | "stock.confirm"
  | "grade.manage"
  | "cart.manage"
  | "order.place"
  | "order.read"
  | "order.cancel"
  | "order.manage"
  | "payment.reconcile"
  | "audit.read"
  | "staff.manage";

const STAFF: ReadonlySet<PlatformRole> = new Set(["OPS", "ADMIN"]);

export function isStaff(actor: Actor): boolean {
  return STAFF.has(actor.platformRole);
}

function isBuyerMember(actor: Actor, roles?: MembershipRole[]): boolean {
  const m = actor.membership;
  if (!m || m.organizationType !== "BUYER") return false;
  return roles ? roles.includes(m.role) : true;
}

/**
 * Role-level permission check. Resource-level checks (e.g. "is this address in
 * the actor's organization?") are done by scoping queries to the actor.
 */
export function can(actor: Actor, permission: Permission): boolean {
  if (!actor.emailVerified) return false;
  switch (permission) {
    case "buyer.onboard":
      return actor.platformRole === "USER" && actor.membership === null;
    case "buyer.profile.read":
    case "cart.manage":
    case "order.place":
    case "order.read":
    case "order.cancel":
      return isBuyerMember(actor);
    case "buyer.profile.update":
    case "buyer.address.manage":
      return isBuyerMember(actor, ["OWNER", "MANAGER"]);
    case "supplier.create":
    case "supplier.read":
    case "supplier.update":
    case "farmVisit.record":
    case "farmVisit.photo.read":
    case "verification.decide":
    case "listing.manage":
    case "stock.confirm":
    case "order.manage":
      return isStaff(actor);
    case "grade.manage":
    case "payment.reconcile":
    case "audit.read":
    case "staff.manage":
      return actor.platformRole === "ADMIN";
  }
}

export function assertCan(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new ForbiddenError();
}
