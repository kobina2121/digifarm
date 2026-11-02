import "server-only";

import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";

import {
  type BusinessDetailsInput,
  businessDetailsSchema,
  type BuyerOnboardingInput,
  buyerOnboardingSchema,
  type DeliveryAddressInput,
  deliveryAddressSchema,
} from "./schemas";

/**
 * Creates the buyer's account (a person or a business, D18), makes them its
 * owner, and saves their first delivery address.
 */
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
      throw new ConflictError("Your account is already set up.");
    }
    const business = data.accountType === "BUSINESS";
    // A personal account goes by the person's own name.
    const legalName = business
      ? data.legalName!
      : (
          await tx.user.findUniqueOrThrow({
            where: { id: actor.userId },
            select: { name: true },
          })
        ).name;

    const organization = await tx.organization.create({
      data: {
        type: "BUYER",
        status: "ACTIVE",
        legalName,
        tradingName: business ? data.tradingName : null,
        phone: data.phone,
        region: data.address.region,
        buyerKind: data.accountType,
        buyerSegment: business ? data.buyerSegment : null,
        createdById: actor.userId,
        memberships: { create: { userId: actor.userId, role: "OWNER" } },
        addresses: {
          create: {
            kind: "DELIVERY",
            label: data.address.label,
            region: data.address.region,
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
        buyerKind: data.accountType,
        buyerSegment: organization.buyerSegment,
        region: data.address.region,
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
      buyerKind: true,
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
          region: true,
        },
      },
    },
  });
}

/** An individual starts buying for a business, or a business updates its details. */
export async function updateBusinessDetails(
  actor: Actor,
  input: BusinessDetailsInput,
) {
  assertCan(actor, "buyer.profile.update");
  const data = parseInput(businessDetailsSchema, input);
  const id = buyerOrgId(actor);
  return db.$transaction(async (tx) => {
    const before = await tx.organization.findUniqueOrThrow({
      where: { id },
      select: {
        legalName: true,
        tradingName: true,
        buyerKind: true,
        buyerSegment: true,
      },
    });
    const after = await tx.organization.update({
      where: { id },
      data: {
        buyerKind: "BUSINESS",
        legalName: data.legalName,
        tradingName: data.tradingName ?? null,
        buyerSegment: data.buyerSegment,
      },
      select: {
        legalName: true,
        tradingName: true,
        buyerKind: true,
        buyerSegment: true,
      },
    });
    await audit(tx, actor, {
      action: "buyer.business_details_updated",
      entityType: "Organization",
      entityId: id,
      before,
      after,
    });
    return after;
  });
}

/** The signed-in person's own name and email, for their profile. */
export async function getMyAccount(actor: Actor) {
  assertCan(actor, "buyer.profile.read");
  return db.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: { name: true, email: true },
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
    const address = await tx.address.create({
      data: {
        organizationId,
        kind: "DELIVERY",
        label: data.label,
        region: data.region,
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
      after: { label: address.label, region: data.region },
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
