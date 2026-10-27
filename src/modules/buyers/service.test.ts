import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { createUser } from "@/test/factories";
import { hasTestDatabase } from "@/test/setup";

import {
  addDeliveryAddress,
  createBuyerOrganization,
  getBuyerProfile,
  removeDeliveryAddress,
} from "./service";

const input = {
  legalName: "Kofi's Kitchen Ltd",
  buyerSegment: "RESTAURANT" as const,
  phone: "024 123 4567",
  address: {
    label: "Main kitchen",
    zoneCode: "ACCRA" as const,
    town: "Osu",
    digitalAddress: "ga-123-4567",
  },
};

/** Onboard a new buyer and return the actor as the session would see them afterwards. */
async function onboardedBuyer(): Promise<Actor> {
  const actor = await createUser();
  const org = await createBuyerOrganization(actor, input);
  return {
    ...actor,
    membership: {
      organizationId: org.id,
      organizationType: "BUYER",
      role: "OWNER",
    },
  };
}

describe.runIf(hasTestDatabase)("buyer onboarding (integration)", () => {
  it("creates the business, owner membership, default address and an audit entry", async () => {
    const buyer = await onboardedBuyer();
    const profile = await getBuyerProfile(buyer);
    expect(profile.legalName).toBe("Kofi's Kitchen Ltd");
    expect(profile.phone).toBe("+233241234567");
    expect(profile.addresses).toHaveLength(1);
    expect(profile.addresses[0]).toMatchObject({
      isDefault: true,
      digitalAddress: "GA-123-4567",
    });
    expect(profile.addresses[0].zone?.code).toBe("ACCRA");

    const auditRow = await db.auditLog.findFirst({
      where: { entityId: profile.id, action: "buyer.onboarded" },
    });
    expect(auditRow?.actorUserId).toBe(buyer.userId);
  });

  it("allows only one business per user, even with simultaneous submissions", async () => {
    const actor = await createUser();
    const results = await Promise.allSettled([
      createBuyerOrganization(actor, input),
      createBuyerOrganization(actor, input),
      createBuyerOrganization(actor, input),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
    }
    expect(await db.membership.count({ where: { userId: actor.userId } })).toBe(
      1,
    );
  });

  it("rejects areas DigiFarm doesn't serve and invalid phone numbers", async () => {
    const actor = await createUser();
    await expect(
      createBuyerOrganization(actor, {
        ...input,
        address: { ...input.address, zoneCode: "TAMALE" as "ACCRA" },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createBuyerOrganization(actor, { ...input, phone: "12345" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("does not let staff or unverified users onboard as buyers", async () => {
    await expect(
      createBuyerOrganization(await createUser({ platformRole: "OPS" }), input),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      createBuyerOrganization(
        await createUser({ emailVerified: false }),
        input,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe.runIf(hasTestDatabase)("buyer addresses (integration)", () => {
  it("keeps each business's addresses private (no IDOR)", async () => {
    const alice = await onboardedBuyer();
    const bob = await onboardedBuyer();
    const aliceAddress = (await getBuyerProfile(alice)).addresses[0];
    await addDeliveryAddress(bob, {
      label: "Second",
      zoneCode: "KUMASI",
      town: "Adum",
    });

    // Bob cannot remove Alice's address by guessing its ID.
    await expect(
      removeDeliveryAddress(bob, aliceAddress.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await getBuyerProfile(alice)).addresses).toHaveLength(1);
    expect((await getBuyerProfile(bob)).addresses).toHaveLength(2);
  });

  it("keeps at least one address and moves the default when removing it", async () => {
    const buyer = await onboardedBuyer();
    const [first] = (await getBuyerProfile(buyer)).addresses;
    await expect(removeDeliveryAddress(buyer, first.id)).rejects.toBeInstanceOf(
      ConflictError,
    );

    await addDeliveryAddress(buyer, {
      label: "Branch",
      zoneCode: "KUMASI",
      town: "Adum",
    });
    await removeDeliveryAddress(buyer, first.id);
    const { addresses } = await getBuyerProfile(buyer);
    expect(addresses).toHaveLength(1);
    expect(addresses[0]).toMatchObject({ label: "Branch", isDefault: true });
  });

  it("does not let plain members manage addresses", async () => {
    const owner = await onboardedBuyer();
    const member: Actor = {
      ...owner,
      membership: { ...owner.membership!, role: "MEMBER" },
    };
    await expect(
      addDeliveryAddress(member, {
        label: "X",
        zoneCode: "ACCRA",
        town: "Osu",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
