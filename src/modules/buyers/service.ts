import "server-only";

import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";

import {
  type BuyerOnboardingInput,
  buyerOnboardingSchema,
  type DeliveryAddressInput,
  deliveryAddressSchema,
} from "./schemas";

async function activeZone(tx: Tx, code: string) {
  const zone = await tx.operatingZone.findUnique({ where: { code } });
  if (!zone || !zone.isActive) {
    throw new ValidationError("DigiFarm doesn't deliver to that area yet.", {
      fieldErrors: { "address.zoneCode": "Choose Greater Accra or Kumasi" },
    });
  }
  return zone;
}

/** Creates the buyer's business, makes them its owner, and saves their first delivery address. */
export async function createBuyerOrganization(
  actor: Actor,
  input: BuyerOnboardingInput,
) {
  assertCan(actor, "buyer.onboard");
  const data = parseInput(buyerOnboardingSchema, input);

  return db.$transaction(async (tx) => {
    // Serialise onboarding per user so a double submit can't create two businesses.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`onboard:${actor.userId}`}))`;
    if (await tx.membership.count({ where: { userId: actor.userId } })) {
      throw new ConflictError("You already have a business set up.");
    }
    const zone = await activeZone(tx, data.address.zoneCode);

    const organization = await tx.organization.create({
      data: {
        type: "BUYER",
        status: "ACTIVE",
        legalName: data.legalName,
        tradingName: data.tradingName,
        phone: data.phone,
        region: zone.region,
        buyerSegment: data.buyerSegment,
        createdById: actor.userId,
        memberships: { create: { userId: actor.userId, role: "OWNER" } },
        addresses: {
          create: {
            kind: "DELIVERY",
            label: data.address.label,
            region: zone.region,
            zoneId: zone.id,
            town: data.address.town,
            district: data.address.district,
            street: data.address.street,
            landmark: data.address.landmark,
            digitalAddress: data.address.digitalAddress,
            isDefault: true,
          },
        },
      },
    });

    await audit(tx, actor, {
      action: "buyer.onboarded",
      entityType: "Organization",
      entityId: organization.id,
      after: {
        legalName: organization.legalName,
        buyerSegment: data.buyerSegment,
        zone: zone.code,
      },
    });
    return organization;
  });
}

function buyerOrgId(actor: Actor): string {
  if (actor.membership?.organizationType !== "BUYER") throw new NotFoundError();
  return actor.membership.organizationId;
}

/** The actor's own business, with its delivery addresses. Never another business's. */
export async function getBuyerProfile(actor: Actor) {
  assertCan(actor, "buyer.profile.read");
  return db.organization.findFirstOrThrow({
    where: { id: buyerOrgId(actor), type: "BUYER", deletedAt: null },
    select: {
      id: true,
      legalName: true,
      tradingName: true,
      phone: true,
      buyerSegment: true,
      status: true,
      addresses: {
        where: { deletedAt: null, kind: "DELIVERY" },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          label: true,
          town: true,
          district: true,
          street: true,
          landmark: true,
          digitalAddress: true,
          isDefault: true,
          zone: { select: { code: true, name: true } },
        },
      },
    },
  });
}

export async function addDeliveryAddress(
  actor: Actor,
  input: DeliveryAddressInput,
) {
  assertCan(actor, "buyer.address.manage");
  const data = parseInput(deliveryAddressSchema, input);
  const organizationId = buyerOrgId(actor);

  return db.$transaction(async (tx) => {
    const zone = await activeZone(tx, data.zoneCode);
    const address = await tx.address.create({
      data: {
        organizationId,
        kind: "DELIVERY",
        label: data.label,
        region: zone.region,
        zoneId: zone.id,
        town: data.town,
        district: data.district,
        street: data.street,
        landmark: data.landmark,
        digitalAddress: data.digitalAddress,
      },
    });
    await audit(tx, actor, {
      action: "buyer.address.added",
      entityType: "Address",
      entityId: address.id,
      after: { label: address.label, zone: zone.code },
    });
    return address;
  });
}

/** Soft-deletes one of the actor's own addresses. Another business's address is "not found". */
export async function removeDeliveryAddress(actor: Actor, addressId: string) {
  assertCan(actor, "buyer.address.manage");
  const organizationId = buyerOrgId(actor);

  return db.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: {
        id: addressId,
        organizationId,
        deletedAt: null,
        kind: "DELIVERY",
      },
    });
    if (!address) throw new NotFoundError("Address not found.");
    const remaining = await tx.address.count({
      where: {
        organizationId,
        deletedAt: null,
        kind: "DELIVERY",
        id: { not: address.id },
      },
    });
    if (remaining === 0)
      throw new ConflictError("Keep at least one delivery address.");

    await tx.address.update({
      where: { id: address.id },
      data: { deletedAt: new Date(), isDefault: false },
    });
    if (address.isDefault) {
      const next = await tx.address.findFirstOrThrow({
        where: { organizationId, deletedAt: null, kind: "DELIVERY" },
        orderBy: { createdAt: "asc" },
      });
      await tx.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
    await audit(tx, actor, {
      action: "buyer.address.removed",
      entityType: "Address",
      entityId: address.id,
      before: { label: address.label },
    });
  });
}
