import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors";
import { createUser } from "@/test/factories";
import { hasTestDatabase } from "@/test/setup";

import {
  createManagedSupplier,
  decideVerification,
  getSupplier,
  listSuppliers,
  readFarmVisitPhoto,
  recordFarmVisit,
} from "./service";

const supplierInput = {
  legalName: "Asante Tomato Farm",
  supplierKind: "FARMER" as const,
  phone: "0551234567",
  region: "ASHANTI" as const,
  town: "Ejura",
};
const visitInput = {
  visitedOn: "2026-10-20",
  produceObserved: "2 acres of tomatoes, near harvest",
  recommendedGrade: "A" as const,
};
const jpeg = () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  return { bytes, size: bytes.length };
};

describe.runIf(hasTestDatabase)("managed suppliers (integration)", () => {
  it("lets staff create a supplier with no login, starting as a prospect", async () => {
    const ops = await createUser({ platformRole: "OPS" });
    const org = await createManagedSupplier(ops, supplierInput);
    const supplier = await getSupplier(ops, org.id);
    expect(supplier.status).toBe("PENDING");
    expect(supplier.verification.status).toBe("PROSPECT");
    expect(
      await db.membership.count({ where: { organizationId: org.id } }),
    ).toBe(0);
    expect(supplier.addresses[0].town).toBe("Ejura");
  });

  it("does not let buyers or plain users touch suppliers", async () => {
    const user = await createUser();
    await expect(
      createManagedSupplier(user, supplierInput),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listSuppliers(user)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("records a visit with photos and moves the supplier to awaiting decision", async () => {
    const ops = await createUser({ platformRole: "OPS" });
    const org = await createManagedSupplier(ops, supplierInput);
    await recordFarmVisit(ops, org.id, visitInput, [jpeg(), jpeg()]);

    const supplier = await getSupplier(ops, org.id);
    expect(supplier.verification.status).toBe("VISITED");
    expect(supplier.verification.visits[0].photos).toHaveLength(2);

    const photo = await readFarmVisitPhoto(
      ops,
      supplier.verification.visits[0].photos[0].id,
    );
    expect(photo.mimeType).toBe("image/jpeg");
    expect(Array.from(photo.bytes.slice(0, 3))).toEqual([0xff, 0xd8, 0xff]);
    await expect(
      readFarmVisitPhoto(
        await createUser(),
        supplier.verification.visits[0].photos[0].id,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects files that aren't images, whatever they claim to be", async () => {
    const ops = await createUser({ platformRole: "OPS" });
    const org = await createManagedSupplier(ops, supplierInput);
    const svg = new TextEncoder().encode("<svg onload=alert(1)></svg>");
    await expect(
      recordFarmVisit(ops, org.id, visitInput, [
        { bytes: svg, size: svg.length },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      recordFarmVisit(ops, org.id, visitInput, [
        { bytes: jpeg().bytes, size: 9 * 1024 * 1024 },
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("requires a different staff member to approve than the one who visited", async () => {
    const visitor = await createUser({ platformRole: "OPS" });
    const approver = await createUser({ platformRole: "ADMIN" });
    const org = await createManagedSupplier(visitor, supplierInput);

    await expect(
      decideVerification(approver, org.id, { decision: "APPROVE" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await recordFarmVisit(visitor, org.id, visitInput, []);
    await expect(
      decideVerification(visitor, org.id, { decision: "APPROVE" }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await decideVerification(approver, org.id, { decision: "APPROVE" });
    const supplier = await getSupplier(approver, org.id);
    expect(supplier.verification.status).toBe("APPROVED");
    expect(supplier.status).toBe("ACTIVE");

    const trail = await db.auditLog.findMany({
      where: { onBehalfOfOrgId: org.id },
      orderBy: { createdAt: "asc" },
      select: { action: true, actorUserId: true },
    });
    expect(trail.map((t) => t.action)).toEqual([
      "supplier.created",
      "supplier.farm_visit.recorded",
      "supplier.verification.approve",
    ]);
    expect(trail[2].actorUserId).toBe(approver.userId);
  });

  it("needs a reason to reject or suspend, and enforces the order of decisions", async () => {
    const ops = await createUser({ platformRole: "OPS" });
    const admin = await createUser({ platformRole: "ADMIN" });
    const org = await createManagedSupplier(ops, supplierInput);
    await recordFarmVisit(ops, org.id, visitInput, []);

    await expect(
      decideVerification(admin, org.id, { decision: "REJECT" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      decideVerification(admin, org.id, { decision: "SUSPEND", notes: "x" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await decideVerification(admin, org.id, { decision: "APPROVE" });
    await decideVerification(admin, org.id, {
      decision: "SUSPEND",
      notes: "Repeated short deliveries",
    });
    expect((await getSupplier(admin, org.id)).status).toBe("SUSPENDED");
  });

  it("only one of two simultaneous decisions wins", async () => {
    const ops = await createUser({ platformRole: "OPS" });
    const adminA = await createUser({ platformRole: "ADMIN" });
    const adminB = await createUser({ platformRole: "ADMIN" });
    const org = await createManagedSupplier(ops, supplierInput);
    await recordFarmVisit(ops, org.id, visitInput, []);

    const results = await Promise.allSettled([
      decideVerification(adminA, org.id, { decision: "APPROVE" }),
      decideVerification(adminB, org.id, {
        decision: "REJECT",
        notes: "Not ready",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});
