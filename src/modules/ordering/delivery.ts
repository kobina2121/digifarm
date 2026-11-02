import "server-only";

import type { FulfilmentStatus } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { type Actor, assertCan, isStaff } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { formatGhanaPhone } from "@/lib/ghana";
import { MAX_PHOTO_BYTES, sniffImageType } from "@/lib/images";
import { logger } from "@/lib/logger";
import { privateStorage } from "@/lib/storage";
import { parseInput } from "@/lib/validation";

import { lockOrder, type LockedOrder, transitionOrder } from "./internal";
import {
  type AssignCarrierInput,
  assignCarrierSchema,
  type ConfirmDeliveryInput,
  confirmDeliverySchema,
  type DeliveryFailedInput,
  deliveryFailedSchema,
} from "./schemas";
import { canMoveFulfilment, orderStatusFromDeliveries } from "./state-machine";

export type ProofPhoto = { bytes: Uint8Array; size: number };

/** Lock the order first, so a delivery step and a cancellation can't interleave. */
async function loadForUpdate(tx: Tx, fulfilmentId: string) {
  const found = await tx.fulfilment.findUnique({
    where: { id: fulfilmentId },
    select: { orderId: true },
  });
  if (!found) throw new NotFoundError("Delivery not found.");
  const order = await lockOrder(tx, found.orderId);
  const fulfilment = await tx.fulfilment.findUniqueOrThrow({
    where: { id: fulfilmentId },
    select: { id: true, status: true, supplierName: true, carrierName: true },
  });
  return { order, fulfilment };
}

function assertCanMove(from: FulfilmentStatus, to: FulfilmentStatus) {
  if (!canMoveFulfilment(from, to)) {
    throw new ConflictError(
      "This delivery has already moved on. Reload to see where it is.",
    );
  }
}

/** Bring the order's status into line with its farms' deliveries. */
async function syncOrderStatus(tx: Tx, order: LockedOrder, actor: Actor) {
  const fulfilments = await tx.fulfilment.findMany({
    where: { orderId: order.id },
    select: { status: true },
  });
  const next = orderStatusFromDeliveries(fulfilments);
  if (order.status !== next) await transitionOrder(tx, order, next, actor);
}

/** Tell the buyer. A failed email must never undo a delivery step. */
async function notifyBuyer(orderId: string, subject: string, body: string[]) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { number: true, placedBy: { select: { email: true, name: true } } },
  });
  await sendEmail({
    to: order.placedBy.email,
    subject: `Order ${order.number}: ${subject}`,
    text: [`Hi ${order.placedBy.name},`, "", ...body].join("\n"),
  }).catch((err: unknown) => {
    logger.error({ err, orderId }, "Couldn't send a delivery email");
  });
}

/** Record who is carrying one farm's produce. Can be changed until it's delivered. */
export async function assignCarrier(
  actor: Actor,
  fulfilmentId: string,
  input: AssignCarrierInput,
) {
  assertCan(actor, "order.manage");
  const data = parseInput(assignCarrierSchema, input);
  await db.$transaction(async (tx) => {
    const { fulfilment } = await loadForUpdate(tx, fulfilmentId);
    if (
      !["CONFIRMED", "PICKED_UP", "DELIVERY_FAILED"].includes(fulfilment.status)
    ) {
      throw new ConflictError("This delivery can’t be changed any more.");
    }
    await tx.fulfilment.update({
      where: { id: fulfilmentId },
      data: {
        carrierName: data.carrierName,
        carrierPhone: data.carrierPhone,
        carrierDetails: data.carrierDetails ?? null,
      },
    });
    await audit(tx, actor, {
      action: "delivery.carrier_assigned",
      entityType: "fulfilment",
      entityId: fulfilmentId,
      after: { carrierName: data.carrierName },
    });
  });
}

/** The produce has left the farm (or is going out again after a failed attempt). */
export async function markPickedUp(actor: Actor, fulfilmentId: string) {
  assertCan(actor, "order.manage");
  const { orderId, farm, carrier, phone } = await db.$transaction(
    async (tx) => {
      const { order, fulfilment } = await loadForUpdate(tx, fulfilmentId);
      assertCanMove(fulfilment.status, "PICKED_UP");
      if (!fulfilment.carrierName) {
        throw new ValidationError("Add who is carrying it first.");
      }
      const updated = await tx.fulfilment.update({
        where: { id: fulfilmentId },
        data: { status: "PICKED_UP", pickedUpAt: new Date() },
        select: { carrierName: true, carrierPhone: true },
      });
      await audit(tx, actor, {
        action: "delivery.picked_up",
        entityType: "fulfilment",
        entityId: fulfilmentId,
      });
      await syncOrderStatus(tx, order, actor);
      return {
        orderId: order.id,
        farm: fulfilment.supplierName,
        carrier: updated.carrierName,
        phone: updated.carrierPhone,
      };
    },
  );
  await notifyBuyer(orderId, "on its way", [
    `Your produce from ${farm} has been picked up and is on its way.`,
    "",
    `It’s with ${carrier}${phone ? `, ${formatGhanaPhone(phone)}` : ""}.`,
  ]);
}

/** Delivered: who received it, and a photo if there is one. */
export async function markDelivered(
  actor: Actor,
  fulfilmentId: string,
  input: ConfirmDeliveryInput,
  photo?: ProofPhoto,
) {
  assertCan(actor, "order.manage");
  const data = parseInput(confirmDeliverySchema, input);

  let proof: { key: string; mime: string } | null = null;
  if (photo) {
    const type = sniffImageType(photo.bytes);
    if (!type)
      throw new ValidationError("The photo must be JPEG, PNG or WebP.");
    if (photo.size > MAX_PHOTO_BYTES) {
      throw new ValidationError("The photo must be 8 MB or smaller.");
    }
    // Stored first: if the database write fails it's orphaned but never exposed.
    proof = {
      key: await privateStorage().put(
        "delivery-proofs",
        photo.bytes,
        type.extension,
      ),
      mime: type.mime,
    };
  }

  const { orderId, farm } = await db.$transaction(async (tx) => {
    const { order, fulfilment } = await loadForUpdate(tx, fulfilmentId);
    assertCanMove(fulfilment.status, "DELIVERED");
    await tx.fulfilment.update({
      where: { id: fulfilmentId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        receiverName: data.receiverName,
        proofStorageKey: proof?.key,
        proofMimeType: proof?.mime,
      },
    });
    await audit(tx, actor, {
      action: "delivery.delivered",
      entityType: "fulfilment",
      entityId: fulfilmentId,
      after: { hasPhoto: Boolean(proof) },
    });
    await syncOrderStatus(tx, order, actor);
    return { orderId: order.id, farm: fulfilment.supplierName };
  });
  await notifyBuyer(orderId, "delivered", [
    `Your produce from ${farm} has been delivered and was received by ${data.receiverName}.`,
    "",
    "If anything isn’t right, please tell us within 24 hours.",
  ]);
}

/** Couldn't be delivered this time. Staff can send it out again. */
export async function markDeliveryFailed(
  actor: Actor,
  fulfilmentId: string,
  input: DeliveryFailedInput,
) {
  assertCan(actor, "order.manage");
  const data = parseInput(deliveryFailedSchema, input);
  const { orderId, farm } = await db.$transaction(async (tx) => {
    const { order, fulfilment } = await loadForUpdate(tx, fulfilmentId);
    assertCanMove(fulfilment.status, "DELIVERY_FAILED");
    await tx.fulfilment.update({
      where: { id: fulfilmentId },
      data: {
        status: "DELIVERY_FAILED",
        deliveryFailedAt: new Date(),
        deliveryFailReason: data.reason,
      },
    });
    await audit(tx, actor, {
      action: "delivery.failed",
      entityType: "fulfilment",
      entityId: fulfilmentId,
      after: { reason: data.reason },
    });
    return { orderId: order.id, farm: fulfilment.supplierName };
  });
  await notifyBuyer(orderId, "delivery didn’t go through", [
    `We couldn’t deliver your produce from ${farm} this time. We’ll be in touch to arrange another try.`,
  ]);
}

/** The photo of a delivery, for staff and the buyer who ordered it. */
export async function readDeliveryProof(actor: Actor, fulfilmentId: string) {
  const row = await db.fulfilment.findUnique({
    where: { id: fulfilmentId },
    select: {
      proofStorageKey: true,
      proofMimeType: true,
      order: { select: { buyerOrgId: true } },
    },
  });
  const allowed =
    isStaff(actor) ||
    actor.membership?.organizationId === row?.order.buyerOrgId;
  if (!row?.proofStorageKey || !row.proofMimeType || !allowed) {
    throw new NotFoundError();
  }
  return {
    bytes: await privateStorage().get(row.proofStorageKey),
    mimeType: row.proofMimeType,
  };
}
