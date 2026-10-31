import { describe, expect, it } from "vitest";

import { type Actor, assertCan, can, type Permission } from "./authz";
import { ForbiddenError } from "./errors";

const base: Actor = {
  userId: "u",
  platformRole: "USER",
  emailVerified: true,
  membership: null,
};
const buyer = (role: "OWNER" | "MANAGER" | "MEMBER"): Actor => ({
  ...base,
  membership: { organizationId: "org", organizationType: "BUYER", role },
});

const ACTORS = {
  newUser: base,
  unverified: { ...base, emailVerified: false },
  buyerOwner: buyer("OWNER"),
  buyerManager: buyer("MANAGER"),
  buyerMember: buyer("MEMBER"),
  ops: { ...base, platformRole: "OPS" },
  admin: { ...base, platformRole: "ADMIN" },
  deliveryPartner: { ...base, platformRole: "DELIVERY_PARTNER" },
} satisfies Record<string, Actor>;

type Who = keyof typeof ACTORS;

// The full permission matrix: who may do what. Anything not listed is denied.
const ALLOWED: Record<Permission, Who[]> = {
  "buyer.onboard": ["newUser"],
  "buyer.profile.read": ["buyerOwner", "buyerManager", "buyerMember"],
  "buyer.profile.update": ["buyerOwner", "buyerManager"],
  "buyer.address.manage": ["buyerOwner", "buyerManager"],
  "supplier.create": ["ops", "admin"],
  "supplier.read": ["ops", "admin"],
  "supplier.update": ["ops", "admin"],
  "farmVisit.record": ["ops", "admin"],
  "farmVisit.photo.read": ["ops", "admin"],
  "verification.decide": ["ops", "admin"],
  "listing.manage": ["ops", "admin"],
  "stock.confirm": ["ops", "admin"],
  "grade.manage": ["admin"],
  "audit.read": ["admin"],
  "staff.manage": ["admin"],
};

describe("permission matrix", () => {
  for (const [permission, allowed] of Object.entries(ALLOWED) as [
    Permission,
    Who[],
  ][]) {
    for (const who of Object.keys(ACTORS) as Who[]) {
      const expected = allowed.includes(who);
      it(`${who} ${expected ? "can" : "cannot"} ${permission}`, () => {
        expect(can(ACTORS[who], permission)).toBe(expected);
      });
    }
  }

  it("denies everything to unverified users, including staff", () => {
    const unverifiedAdmin: Actor = { ...ACTORS.admin, emailVerified: false };
    for (const permission of Object.keys(ALLOWED) as Permission[]) {
      expect(can(unverifiedAdmin, permission)).toBe(false);
    }
  });

  it("assertCan throws ForbiddenError", () => {
    expect(() => assertCan(ACTORS.buyerOwner, "verification.decide")).toThrow(
      ForbiddenError,
    );
  });
});
