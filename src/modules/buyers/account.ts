import "server-only";

import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { type Actor, assertCan } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ConflictError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseInput } from "@/lib/validation";

import { type DeleteAccountInput, deleteAccountSchema } from "./schemas";

const DELETED_NAME = "Deleted user";
const DELETED_ORGANIZATION = "Deleted account";
const CANCELLED_REASON = "Cancelled by the buyer";

/** What stands in the way of deleting: money or produce still on the move. */
async function openWork(client: Tx | typeof db, organizationId?: string) {
  if (!organizationId) return { activeOrders: 0, openRefunds: 0 };
  const buyerOrgId = organizationId;
  const [activeOrders, openRefunds] = await Promise.all([
    client.order.count({
      where: {
        buyerOrgId,
        status: {
          in: [
            "PENDING_PAYMENT",
            "PAID",
            "IN_FULFILMENT",
            "PARTIALLY_DELIVERED",
          ],
        },
      },
    }),
    client.refund.count({
      where: {
        payment: { order: { buyerOrgId } },
        status: { in: ["PENDING", "PROCESSING", "FAILED"] },
      },
    }),
  ]);
  return { activeOrders, openRefunds };
}

/** For the delete screen: can they go ahead, and do they confirm with a password? */
export async function getAccountDeletionInfo(actor: Actor) {
  assertCan(actor, "account.delete");
  const [credential, work] = await Promise.all([
    db.account.findFirst({
      where: { userId: actor.userId, providerId: "credential" },
      select: { id: true },
    }),
    openWork(db, actor.membership?.organizationId),
  ]);
  return { hasPassword: Boolean(credential), ...work };
}

async function checkPassword(userId: string, password: string | undefined) {
  const credential = await db.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { password: true },
  });
  if (!credential?.password) return; // signs in with Google only
  const { password: hasher } = await auth.$context;
  const valid = password
    ? await hasher.verify({ hash: credential.password, password })
    : false;
  if (!valid) {
    const message = "That password isn’t right.";
    throw new ValidationError(message, { fieldErrors: { password: message } });
  }
}

/**
 * Erase a customer at their request. The person goes: sign-in, name, contact
 * details, addresses, cart and saved products. Past orders and payments stay
 * for accounting (they can't be removed), with nothing left on them that
 * identifies the person beyond town and region. Their email is freed, so they
 * can sign up again as a new customer.
 *
 * Refused while an order or refund is under way, so nobody loses track of
 * money or a delivery. Audit logs are append-only and aren't changed.
 */
export async function deleteAccount(actor: Actor, input: DeleteAccountInput) {
  assertCan(actor, "account.delete");
  const data = parseInput(deleteAccountSchema, input);
  await checkPassword(actor.userId, data.password);

  const organizationId = actor.membership?.organizationId;
  const { email, name } = await db.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: { email: true, name: true },
  });

  await db.$transaction(async (tx) => {
    if (organizationId) {
      const work = await openWork(tx, organizationId);
      if (work.activeOrders || work.openRefunds) {
        throw new ConflictError(
          "You have an order or refund in progress. You can delete your account once it’s finished.",
        );
      }
      const others = await tx.membership.count({
        where: { organizationId, userId: { not: actor.userId } },
      });
      if (others) {
        throw new ConflictError(
          "Other people use this business account. Contact DigiFarm to close it.",
        );
      }

      await tx.savedListing.deleteMany({
        where: { buyerOrgId: organizationId },
      });
      await tx.cart.deleteMany({ where: { buyerOrgId: organizationId } });
      await tx.address.deleteMany({ where: { organizationId } });
      await tx.$executeRaw`
        UPDATE "order"
        SET "buyerNotes" = NULL,
            "deliveryAddressSnapshot" = "deliveryAddressSnapshot"
              - 'label' - 'street' - 'landmark' - 'digitalAddress' - 'district'
        WHERE "buyerOrgId" = ${organizationId}::uuid`;
      // Reasons for cancelling are typed by the customer, so they could say anything.
      await tx.$executeRaw`
        UPDATE "refund" AS r
        SET "reason" = ${CANCELLED_REASON}
        FROM "payment" AS p, "order" AS o
        WHERE r."paymentId" = p."id" AND p."orderId" = o."id"
          AND o."buyerOrgId" = ${organizationId}::uuid
          AND r."reason" = o."cancelReason"`;
      await tx.order.updateMany({
        where: { buyerOrgId: organizationId, cancelReason: { not: null } },
        data: { cancelReason: CANCELLED_REASON },
      });
      await tx.orderStatusHistory.updateMany({
        where: { actorUserId: actor.userId, reason: { not: null } },
        data: { reason: CANCELLED_REASON },
      });
      await tx.membership.deleteMany({ where: { userId: actor.userId } });
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          legalName: DELETED_ORGANIZATION,
          tradingName: null,
          phone: "",
          email: null,
          district: null,
          buyerSegment: null,
          deletedAt: new Date(),
        },
      });
    }

    await tx.session.deleteMany({ where: { userId: actor.userId } });
    await tx.account.deleteMany({ where: { userId: actor.userId } });
    // Password reset links are stored against the user's ID.
    await tx.verification.deleteMany({ where: { value: actor.userId } });
    await tx.user.update({
      where: { id: actor.userId },
      data: {
        name: DELETED_NAME,
        email: `deleted-${actor.userId}@deleted.digifarm.invalid`,
        emailVerified: false,
        image: null,
        phone: null,
        status: "DELETED",
      },
    });
    await audit(tx, actor, {
      action: "account.deleted",
      entityType: "User",
      entityId: actor.userId,
      after: { organizationId: organizationId ?? null },
    });
  });

  // The account is gone either way, so a failed email must not look like a failed delete.
  await sendEmail({
    to: email,
    subject: "Your DigiFarm account has been deleted",
    text: `Hello ${name},\n\nYour DigiFarm account has been deleted, as you asked. You won't be able to sign in with it again.\n\nWe keep records of past orders and payments for accounting, without your name or contact details.\n\nIf you didn't ask for this, reply to this email straight away.`,
  }).catch((err: unknown) => {
    logger.error({ err }, "Couldn't send the account deleted email");
  });
}
