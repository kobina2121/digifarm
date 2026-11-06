import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { publicStorage } from "@/lib/storage";
import { createBuyerOrganization } from "@/modules/buyers";
import {
  createManagedSupplier,
  decideVerification,
  recordFarmVisit,
} from "@/modules/suppliers";
import { createUser } from "@/test/factories";
import { hasTestDatabase } from "@/test/setup";

import {
  addListingPhotos,
  browseListings,
  changeListingStatus,
  confirmStock,
  countStaleListings,
  createListing,
  getListingForStaff,
  getMarketListing,
  getMarketSupplier,
  listGrades,
  listListingsForStaff,
  listSavedListings,
  savedListingIds,
  setListingSaved,
  updateGrade,
  updateListing,
} from "./service";

async function approvedSupplier(name = "Ejura Tomato Farm") {
  const visitor = await createUser({ platformRole: "OPS" });
  const approver = await createUser({ platformRole: "OPS" });
  const org = await createManagedSupplier(visitor, {
    legalName: name,
    supplierKind: "FARMER",
    phone: "0551234567",
    region: "ASHANTI",
    town: "Ejura",
  });
  await recordFarmVisit(
    visitor,
    org.id,
    { visitedOn: "2026-10-20", produceObserved: "Tomatoes near harvest" },
    [],
  );
  await decideVerification(approver, org.id, { decision: "APPROVE" });
  return { org, staff: approver };
}

async function productId(slug = "tomato-pectomech") {
  const product = await db.product.findUniqueOrThrow({ where: { slug } });
  return product.id;
}

async function listing(
  overrides: Partial<Parameters<typeof createListing>[1]> = {},
) {
  const { org, staff } = await approvedSupplier();
  const created = await createListing(staff, {
    supplierId: org.id,
    productId: await productId(),
    unitCode: "CRATE",
    gradeCode: "A",
    price: "450",
    availableFrom: "2026-10-01",
    initialStock: "40",
    ...overrides,
  });
  return { listing: created, org, staff };
}

describe.runIf(hasTestDatabase)("catalogue (integration)", () => {
  it("only lets staff create listings, and only for approved suppliers", async () => {
    const { org, staff } = await approvedSupplier();
    const input = {
      supplierId: org.id,
      productId: await productId(),
      unitCode: "CRATE",
      price: "450",
      availableFrom: "2026-10-01",
      initialStock: "40",
    };
    await expect(
      createListing(await createUser(), input),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const prospect = await createManagedSupplier(staff, {
      legalName: "Not Yet Visited Farm",
      supplierKind: "FARMER",
      phone: "0241234567",
      region: "VOLTA",
      town: "Ho",
    });
    await expect(
      createListing(staff, { ...input, supplierId: prospect.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("creates a listing with its opening stock, priced in pesewas", async () => {
    const { listing: created, staff } = await listing();
    expect(created.unitPriceMinor).toBe(BigInt(45000));
    expect(created.status).toBe("ACTIVE");

    const detail = await getListingForStaff(staff, created.id);
    expect(detail.onHand).toBe("40");
    expect(detail.movements).toHaveLength(1);
    expect(detail.movements[0]).toMatchObject({
      type: "ADJUST",
      quantity: "40",
    });
    expect(detail.availability.available).toBe(true);
    expect(detail.grade?.code).toBe("A");
  });

  it("shows buyers the listing without the farmer's phone number", async () => {
    const { listing: created, org } = await listing();
    const { listing: market } = await getMarketListing(created.id);
    expect(market.price).toBe("GH₵ 450.00");
    expect(market.minOrderLabel).toBe("1 crate");
    expect(market.supplier.verified).toBe(true);
    expect(JSON.stringify(market)).not.toContain("0551234567");

    const profile = await getMarketSupplier(org.id);
    expect(profile.listings.map((l) => l.id)).toContain(created.id);
    expect(JSON.stringify(profile)).not.toContain("0551234567");
  });

  it("records a stock update, and never lets stock fall below what is reserved", async () => {
    const { listing: created, staff } = await listing();
    await db.listing.update({
      where: { id: created.id },
      data: { stockConfirmedAt: new Date("2026-01-01") },
    });
    // Old stock is still for sale (Akuafo's stock is the truth); it only
    // shows up on the staff reminder list.
    const { listing: market } = await getMarketListing(created.id);
    expect(market.availability.available).toBe(true);
    const staleIds = (
      await listListingsForStaff(staff, { view: "stale" })
    ).items.map((l) => l.id);
    expect(staleIds).toContain(created.id);
    expect(await countStaleListings(staff)).toBeGreaterThan(0);

    await confirmStock(staff, created.id, {
      onHand: "12.5",
      note: "Called Kofi",
    });
    const detail = await getListingForStaff(staff, created.id);
    expect(detail.onHand).toBe("12.5");
    expect(detail.availability.available).toBe(true);
    expect(detail.movements[0]).toMatchObject({
      quantity: "-27.5",
      onHandAfter: "12.5",
      reason: "Called Kofi",
    });
    const audits = await db.auditLog.count({
      where: { entityId: created.id, action: "listing.stock_confirmed" },
    });
    expect(audits).toBe(1);

    await db.inventoryRecord.update({
      where: { listingId: created.id },
      data: { reserved: "10" },
    });
    await expect(
      confirmStock(staff, created.id, { onHand: "8" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("keeps stock history append-only", async () => {
    const { listing: created } = await listing();
    const inventory = await db.inventoryRecord.findUniqueOrThrow({
      where: { listingId: created.id },
    });
    await expect(
      db.$executeRaw`UPDATE "inventory_movement" SET quantity = 0 WHERE "inventoryId" = ${inventory.id}::uuid`,
    ).rejects.toThrow(/append-only/);
  });

  it("pauses with a reason, hides paused listings from buyers, and audits each change", async () => {
    const { listing: created, staff } = await listing();
    await expect(
      changeListingStatus(staff, created.id, { action: "PAUSE" }),
    ).rejects.toBeInstanceOf(ValidationError);

    await changeListingStatus(staff, created.id, {
      action: "PAUSE",
      reason: "Rain damaged the crop",
    });
    await expect(getMarketListing(created.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await changeListingStatus(staff, created.id, { action: "RESUME" });
    await expect(getMarketListing(created.id)).resolves.toBeTruthy();

    await changeListingStatus(staff, created.id, {
      action: "ARCHIVE",
      reason: "Season over",
    });
    await expect(
      changeListingStatus(staff, created.id, { action: "RESUME" }),
    ).rejects.toBeInstanceOf(ConflictError);
    const actions = await db.auditLog.findMany({
      where: { entityId: created.id },
      orderBy: { createdAt: "asc" },
      select: { action: true },
    });
    expect(actions.map((a) => a.action)).toEqual([
      "listing.created",
      "listing.pause",
      "listing.resume",
      "listing.archive",
    ]);
  });

  it("removes a suspended supplier's listings from the market and blocks republishing", async () => {
    const { listing: created, org, staff } = await listing({ publish: false });
    const admin = await createUser({ platformRole: "ADMIN" });
    await decideVerification(admin, org.id, {
      decision: "SUSPEND",
      notes: "Quality complaints",
    });
    await expect(
      changeListingStatus(staff, created.id, { action: "PUBLISH" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(getMarketSupplier(org.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("filters the market by search, category, farm region, grade, price and stock", async () => {
    const { listing: tomato, org, staff } = await listing();
    const maize = await createListing(staff, {
      supplierId: org.id,
      productId: await productId("maize-white"),
      unitCode: "BAG",
      gradeCode: "B",
      price: "900",
      availableFrom: "2026-10-01",
      initialStock: "0",
    });
    const ids = async (params: Record<string, string>) =>
      (await browseListings(params)).items.map((l) => l.id);

    expect(await ids({ q: "pectomech" })).toContain(tomato.id);
    expect(await ids({ q: "pectomech" })).not.toContain(maize.id);
    expect(await ids({ category: "grains" })).toContain(maize.id);
    expect(await ids({ category: "grains" })).not.toContain(tomato.id);
    // The farm is in Ashanti.
    expect(await ids({ region: "ASHANTI" })).toContain(tomato.id);
    expect(await ids({ region: "VOLTA" })).not.toContain(tomato.id);
    expect(await ids({ grade: "B" })).toContain(maize.id);
    expect(await ids({ maxPrice: "500" })).not.toContain(maize.id);
    expect(await ids({ minPrice: "500" })).toContain(maize.id);
    // Out of stock still shows (as unavailable) unless "in stock only" is on.
    expect(await ids({})).toContain(maize.id);
    expect(await ids({ inStock: "1" })).not.toContain(maize.id);
    expect(await ids({ inStock: "1" })).toContain(tomato.id);
    // Junk in the URL is ignored, not an error.
    await expect(
      browseListings({ region: "LAGOS", minPrice: "abc", cursor: "x" }),
    ).resolves.toBeTruthy();
  });

  it("logs every listing edit with before and after values", async () => {
    const { listing: created, staff } = await listing();
    await updateListing(staff, created.id, {
      price: "480.50",
      gradeCode: "B",
      availableFrom: "2026-10-01",
    });
    const entry = await db.auditLog.findFirstOrThrow({
      where: { entityId: created.id, action: "listing.updated" },
    });
    expect(entry.before).toMatchObject({ price: "450.00", grade: "A" });
    expect(entry.after).toMatchObject({ price: "480.50", grade: "B" });
  });

  it("lets only admins change grade wording", async () => {
    const ops = await createUser({ platformRole: "OPS" });
    const admin = await createUser({ platformRole: "ADMIN" });
    const [category] = await listGrades(ops);
    const grade = category.grades[0];
    await expect(
      updateGrade(ops, grade.id, {
        title: "Premium",
        description: "Ops should not be able to change this.",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await updateGrade(admin, grade.id, {
      title: grade.title,
      description: grade.description,
    });
    expect(
      await db.auditLog.count({
        where: { entityId: grade.id, action: "grade.updated" },
      }),
    ).toBeGreaterThan(0);
  });

  it("turns photos into small WebP files with location data removed", async () => {
    const { listing: created, staff } = await listing();
    const jpeg = await sharp({
      create: { width: 2000, height: 1500, channels: 3, background: "#c33" },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "Farm location test" } })
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeDefined();

    const bytes = new Uint8Array(jpeg);
    await addListingPhotos(staff, created.id, [{ bytes, size: bytes.length }]);
    const detail = await getListingForStaff(staff, created.id);
    expect(detail.photoItems).toHaveLength(1);
    expect(detail.photoItems[0]).toMatchObject({ width: 1200, height: 900 });

    const key = detail.photoItems[0].src.replace("/media/", "");
    const stored = await publicStorage().get(key);
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(480);
    expect(meta.exif).toBeUndefined();

    const fake = new TextEncoder().encode("<svg onload=alert(1)>");
    await expect(
      addListingPhotos(staff, created.id, [{ bytes: fake, size: fake.length }]),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("lets a buyer save and unsave listings, showing only ones still on sale", async () => {
    const { listing: tomato, staff } = await listing();
    const { listing: other } = await listing();
    const user = await createUser({ name: "Esi Owusu" });
    const org = await createBuyerOrganization(user, {
      phone: "0241234567",
      address: { label: "Home", region: "CENTRAL", town: "Cape Coast" },
    });
    const buyer = {
      ...user,
      membership: {
        organizationId: org.id,
        organizationType: "BUYER" as const,
        role: "OWNER" as const,
      },
    };

    await setListingSaved(buyer, tomato.id, true);
    await setListingSaved(buyer, tomato.id, true); // saving twice is harmless
    await setListingSaved(buyer, other.id, true);
    expect((await listSavedListings(buyer)).map((l) => l.id)).toEqual([
      other.id,
      tomato.id,
    ]);
    expect(await savedListingIds(buyer, [tomato.id])).toEqual(
      new Set([tomato.id]),
    );

    // A paused listing drops off the saved list.
    await changeListingStatus(staff, other.id, {
      action: "PAUSE",
      reason: "Farmer is restocking",
    });
    expect((await listSavedListings(buyer)).map((l) => l.id)).toEqual([
      tomato.id,
    ]);

    await setListingSaved(buyer, tomato.id, false);
    await setListingSaved(buyer, tomato.id, false);
    expect(await savedListingIds(buyer, [tomato.id, other.id])).toEqual(
      new Set([other.id]),
    );

    // Only buyers can save.
    await expect(
      setListingSaved(
        await createUser({ platformRole: "OPS" }),
        tomato.id,
        true,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
