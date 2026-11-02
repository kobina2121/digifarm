import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/authz";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { createUser } from "@/test/factories";
import { hasTestDatabase } from "@/test/setup";

import { deleteAccount, getAccountDeletionInfo } from "./account";
import { createBuyerOrganization } from "./service";

const PASSWORD = "correct-horse-battery";
const confirm = { confirmation: "DELETE" as const };

async function customer(): Promise<{ actor: Actor; orgId: string }> {
  const user = await createUser({ name: "Esi Owusu" });
  const org = await createBuyerOrganization(user, {
    phone: "0241234567",
    address: {
      label: "Home",
      region: "CENTRAL",
      town: "Cape Coast",
      street: "12 Beach Road",
    },
  });
  return {
    actor: {
      ...user,
      membership: {
        organizationId: org.id,
        organizationType: "BUYER",
        role: "OWNER",
      },
    },
    orgId: org.id,
  };
}

async function addPassword(userId: string) {
  const { password } = await auth.$context;
  await db.account.create({
    data: {
      id: `credential-${userId}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: await password.hash(PASSWORD),
    },
  });
}

describe.runIf(hasTestDatabase)("deleting an account (integration)", () => {
  it("erases the person, and their email can sign up again", async () => {
    const { actor, orgId } = await customer();
    await addPassword(actor.userId);
    const { email } = await db.user.findUniqueOrThrow({
      where: { id: actor.userId },
    });
    await db.session.create({
      data: {
        id: `session-${actor.userId}`,
        token: `token-${actor.userId}`,
        expiresAt: new Date(Date.now() + 60_000),
        userId: actor.userId,
      },
    });
    await db.verification.create({
      data: {
        id: `reset-${actor.userId}`,
        identifier: `reset-password:${actor.userId}`,
        value: actor.userId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await db.cart.create({ data: { buyerOrgId: orgId } });

    await deleteAccount(actor, { ...confirm, password: PASSWORD });

    const user = await db.user.findUniqueOrThrow({
      where: { id: actor.userId },
    });
    expect(user).toMatchObject({
      name: "Deleted user",
      status: "DELETED",
      phone: null,
      image: null,
      emailVerified: false,
    });
    expect(user.email).not.toBe(email);
    const org = await db.organization.findUniqueOrThrow({
      where: { id: orgId },
    });
    expect(org).toMatchObject({ legalName: "Deleted account", phone: "" });
    expect(org.deletedAt).not.toBeNull();

    const where = { userId: actor.userId };
    expect(await db.session.count({ where })).toBe(0);
    expect(await db.account.count({ where })).toBe(0);
    expect(await db.membership.count({ where })).toBe(0);
    expect(
      await db.verification.count({ where: { value: actor.userId } }),
    ).toBe(0);
    expect(await db.address.count({ where: { organizationId: orgId } })).toBe(
      0,
    );
    expect(await db.cart.count({ where: { buyerOrgId: orgId } })).toBe(0);
    expect(
      await db.auditLog.count({
        where: { entityId: actor.userId, action: "account.deleted" },
      }),
    ).toBe(1);

    // The address is free for a new account.
    await expect(
      db.user.create({
        data: { id: `new-${actor.userId}`, name: "Esi", email },
      }),
    ).resolves.toBeTruthy();
  });

  it("changes nothing without the typed word or the right password", async () => {
    const { actor } = await customer();
    await addPassword(actor.userId);

    await expect(
      deleteAccount(actor, {
        confirmation: "delete" as "DELETE",
        password: PASSWORD,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      deleteAccount(actor, { ...confirm, password: "wrong-password" }),
    ).rejects.toThrow(/password isn’t right/);
    await expect(deleteAccount(actor, confirm)).rejects.toThrow(
      /password isn’t right/,
    );

    const user = await db.user.findUniqueOrThrow({
      where: { id: actor.userId },
    });
    expect(user).toMatchObject({ name: "Esi Owusu", status: "ACTIVE" });
    expect(await db.account.count({ where: { userId: actor.userId } })).toBe(1);
  });

  it("asks people who sign in with Google for the typed word only", async () => {
    const { actor } = await customer();
    expect(await getAccountDeletionInfo(actor)).toEqual({
      hasPassword: false,
      activeOrders: 0,
      openRefunds: 0,
    });
    await deleteAccount(actor, confirm);
    expect(
      await db.user.findUniqueOrThrow({
        where: { id: actor.userId },
        select: { status: true },
      }),
    ).toEqual({ status: "DELETED" });
  });

  it("works for someone who never finished setting up", async () => {
    const actor = await createUser({ name: "New Person" });
    await deleteAccount(actor, confirm);
    expect(
      await db.user.findUniqueOrThrow({
        where: { id: actor.userId },
        select: { name: true },
      }),
    ).toEqual({ name: "Deleted user" });
  });

  it("isn't for staff accounts", async () => {
    const staff = await createUser({ platformRole: "OPS" });
    await expect(deleteAccount(staff, confirm)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
