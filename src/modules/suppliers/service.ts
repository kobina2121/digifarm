import "server-only";

import type { VerificationStatus } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_VISIT,
  sha256Hex,
  sniffImageType,
} from "@/lib/images";
import { privateStorage } from "@/lib/storage";
import { parseInput } from "@/lib/validation";

import {
  type CreateSupplierInput,
  createSupplierSchema,
  type FarmVisitInput,
  farmVisitSchema,
  type VerificationDecisionInput,
  verificationDecisionSchema,
} from "./schemas";
import {
  allowedDecisions,
  nextVerificationState,
  statusAfterVisit,
} from "./state-machine";

const PAGE_SIZE = 20;

/** Staff create a supplier on a farmer's behalf (ROADMAP D6). No login is created for the farmer. */
export async function createManagedSupplier(
  actor: Actor,
  input: CreateSupplierInput,
) {
  assertCan(actor, "supplier.create");
  const data = parseInput(createSupplierSchema, input);

  return db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        type: "SUPPLIER",
        status: "PENDING",
        legalName: data.legalName,
        tradingName: data.tradingName,
        phone: data.phone,
        region: data.region,
        district: data.district,
        supplierKind: data.supplierKind,
        createdById: actor.userId,
        verification: { create: { status: "PROSPECT" } },
        addresses: {
          create: {
            kind: "PICKUP",
            label: "Farm",
            region: data.region,
            district: data.district,
            town: data.town,
            landmark: data.landmark,
            digitalAddress: data.digitalAddress,
            isDefault: true,
          },
        },
      },
    });
    await audit(tx, actor, {
      action: "supplier.created",
      entityType: "Organization",
      entityId: organization.id,
      onBehalfOfOrgId: organization.id,
      after: {
        legalName: data.legalName,
        supplierKind: data.supplierKind,
        region: data.region,
      },
    });
    return organization;
  });
}

export async function listSuppliers(
  actor: Actor,
  opts: { status?: VerificationStatus; cursor?: string } = {},
) {
  assertCan(actor, "supplier.read");
  const rows = await db.organization.findMany({
    where: {
      type: "SUPPLIER",
      deletedAt: null,
      ...(opts.status ? { verification: { status: opts.status } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      legalName: true,
      tradingName: true,
      supplierKind: true,
      region: true,
      phone: true,
      createdAt: true,
      verification: { select: { status: true } },
      _count: { select: { addresses: true } },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function countSuppliersByStatus(actor: Actor) {
  assertCan(actor, "supplier.read");
  const groups = await db.supplierVerification.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts: Record<VerificationStatus, number> = {
    PROSPECT: 0,
    VISITED: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };
  for (const g of groups) counts[g.status] = g._count._all;
  return counts;
}

export async function getSupplier(actor: Actor, organizationId: string) {
  assertCan(actor, "supplier.read");
  const supplier = await db.organization.findFirst({
    where: { id: organizationId, type: "SUPPLIER", deletedAt: null },
    select: {
      id: true,
      legalName: true,
      tradingName: true,
      supplierKind: true,
      phone: true,
      region: true,
      district: true,
      status: true,
      createdAt: true,
      createdBy: { select: { name: true } },
      addresses: {
        where: { deletedAt: null, kind: "PICKUP" },
        select: {
          id: true,
          town: true,
          district: true,
          landmark: true,
          digitalAddress: true,
        },
      },
      verification: {
        select: {
          id: true,
          status: true,
          decidedAt: true,
          decisionNotes: true,
          decidedBy: { select: { name: true } },
          visits: {
            orderBy: { visitedAt: "desc" },
            select: {
              id: true,
              visitedAt: true,
              produceObserved: true,
              recommendedGrade: true,
              notes: true,
              latitude: true,
              longitude: true,
              visitedById: true,
              visitedBy: { select: { name: true } },
              photos: { select: { id: true }, orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!supplier || !supplier.verification)
    throw new NotFoundError("Supplier not found.");

  const visitorIds = new Set(
    supplier.verification.visits.map((v) => v.visitedById),
  );
  return {
    ...supplier,
    verification: supplier.verification,
    allowedDecisions: allowedDecisions(supplier.verification.status),
    /** True when this actor recorded a visit, and so may not approve (separation of duties). */
    actorIsVisitor: visitorIds.has(actor.userId),
  };
}

export type PhotoUpload = { bytes: Uint8Array; size: number };

/** Record a farm visit with photos. Photos are content-checked, then stored privately. */
export async function recordFarmVisit(
  actor: Actor,
  organizationId: string,
  input: FarmVisitInput,
  photos: PhotoUpload[],
) {
  assertCan(actor, "farmVisit.record");
  const data = parseInput(farmVisitSchema, input);

  if (photos.length > MAX_PHOTOS_PER_VISIT) {
    throw new ValidationError(`Attach at most ${MAX_PHOTOS_PER_VISIT} photos.`);
  }
  const checked = photos.map((photo, i) => {
    if (photo.size > MAX_PHOTO_BYTES)
      throw new ValidationError(`Photo ${i + 1} is larger than 8 MB.`);
    const type = sniffImageType(photo.bytes);
    if (!type)
      throw new ValidationError(
        `Photo ${i + 1} isn't a JPEG, PNG or WebP image.`,
      );
    return { ...photo, type, sha256: sha256Hex(photo.bytes) };
  });

  const visitedAt = new Date(`${data.visitedOn}T12:00:00Z`);
  if (visitedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new ValidationError("The visit date can't be in the future.", {
      fieldErrors: { visitedOn: "The visit date can't be in the future" },
    });
  }

  const verification = await db.supplierVerification.findFirst({
    where: {
      organizationId,
      organization: { type: "SUPPLIER", deletedAt: null },
    },
  });
  if (!verification) throw new NotFoundError("Supplier not found.");

  // Store files first; if the database write fails they are orphaned but never exposed.
  const storage = privateStorage();
  const stored = await Promise.all(
    checked.map(async (p) => ({
      storageKey: await storage.put("farm-visits", p.bytes, p.type.extension),
      mimeType: p.type.mime,
      sizeBytes: p.size,
      sha256: p.sha256,
    })),
  );

  return db.$transaction(async (tx) => {
    const visit = await tx.farmVisit.create({
      data: {
        verificationId: verification.id,
        visitedById: actor.userId,
        visitedAt,
        produceObserved: data.produceObserved,
        recommendedGrade: data.recommendedGrade,
        notes: data.notes,
        latitude: data.latitude,
        longitude: data.longitude,
        photos: { create: stored },
      },
    });
    const status = statusAfterVisit(verification.status);
    if (status !== verification.status) {
      await tx.supplierVerification.update({
        where: { id: verification.id },
        data: { status },
      });
    }
    await audit(tx, actor, {
      action: "supplier.farm_visit.recorded",
      entityType: "FarmVisit",
      entityId: visit.id,
      onBehalfOfOrgId: organizationId,
      before: { status: verification.status },
      after: {
        status,
        photos: stored.length,
        recommendedGrade: data.recommendedGrade ?? null,
      },
    });
    return visit;
  });
}

export async function decideVerification(
  actor: Actor,
  organizationId: string,
  input: VerificationDecisionInput,
) {
  assertCan(actor, "verification.decide");
  const data = parseInput(verificationDecisionSchema, input);

  return db.$transaction(async (tx) => {
    // Lock the verification row so two staff can't decide at the same moment.
    const [locked] = await tx.$queryRaw<
      { id: string; status: VerificationStatus }[]
    >`
      SELECT v.id, v.status FROM "supplier_verification" v
      JOIN "organization" o ON o.id = v."organizationId"
      WHERE v."organizationId" = ${organizationId}::uuid AND o.type = 'SUPPLIER' AND o."deletedAt" IS NULL
      FOR UPDATE OF v`;
    if (!locked) throw new NotFoundError("Supplier not found.");

    const next = nextVerificationState(locked.status, data.decision);
    if (!next) {
      throw new ConflictError(
        `This supplier can't be ${data.decision.toLowerCase()}d from its current status.`,
      );
    }
    if (data.decision === "APPROVE") {
      const ownVisits = await tx.farmVisit.count({
        where: { verificationId: locked.id, visitedById: actor.userId },
      });
      if (ownVisits > 0) {
        throw new ForbiddenError(
          "A different staff member must approve a farm you visited yourself.",
        );
      }
    }

    await tx.supplierVerification.update({
      where: { id: locked.id },
      data: {
        status: next.status,
        decidedById: actor.userId,
        decidedAt: new Date(),
        decisionNotes: data.notes ?? null,
      },
    });
    await tx.organization.update({
      where: { id: organizationId },
      data: { status: next.organizationStatus },
    });
    await audit(tx, actor, {
      action: `supplier.verification.${data.decision.toLowerCase()}`,
      entityType: "SupplierVerification",
      entityId: locked.id,
      onBehalfOfOrgId: organizationId,
      before: { status: locked.status },
      after: { status: next.status, notes: data.notes ?? null },
    });
    return next;
  });
}

/** A farm-visit photo for an authorized staff member. Buyers never get here. */
export async function readFarmVisitPhoto(actor: Actor, photoId: string) {
  assertCan(actor, "farmVisit.photo.read");
  const photo = await db.farmVisitPhoto.findUnique({ where: { id: photoId } });
  if (!photo) throw new NotFoundError();
  return {
    bytes: await privateStorage().get(photo.storageKey),
    mimeType: photo.mimeType,
  };
}
