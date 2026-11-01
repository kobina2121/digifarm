import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type {
  GhanaRegion,
  ListingStatus,
  SupplierKind,
} from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { type Actor, assertCan } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { processListingPhoto } from "@/lib/image-processing";
import { MAX_PHOTO_BYTES } from "@/lib/images";
import { Money } from "@/lib/money";
import { publicStorage } from "@/lib/storage";
import { parseInput } from "@/lib/validation";
import { createInventory, setOnHand } from "@/modules/inventory";

import {
  type Availability,
  availabilityOf,
  stockReminderCutoff,
} from "./availability";
import {
  type BrowseFilters,
  browseSchema,
  type ConfirmStockInput,
  confirmStockSchema,
  type CreateListingInput,
  createListingSchema,
  type GradeUpdateInput,
  gradeUpdateSchema,
  type ListingStatusChangeInput,
  listingStatusChangeSchema,
  type UpdateListingInput,
  updateListingSchema,
} from "./schemas";
import { allowedListingActions, nextListingStatus } from "./state-machine";

const PAGE_SIZE = 24;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** IDs come from URLs; a malformed one is simply "not found", never a database error. */
function assertId(id: string, what: string) {
  if (!UUID.test(id)) throw new NotFoundError(`${what} not found.`);
}
export const MAX_PHOTOS_PER_LISTING = 6;

// ─── Shared shapes ──────────────────────────────────────────────────────────

/** Suppliers buyers may see: approved after a farm visit and not suspended. */
const PUBLIC_SUPPLIER = {
  type: "SUPPLIER",
  deletedAt: null,
  status: "ACTIVE",
  verification: { is: { status: "APPROVED" } },
} satisfies Prisma.OrganizationWhereInput;

const PUBLIC_LISTING = {
  status: "ACTIVE",
  deletedAt: null,
  supplier: PUBLIC_SUPPLIER,
  product: { isActive: true },
} satisfies Prisma.ListingWhereInput;

/** Only public fields: never the farmer's phone number or exact location. */
const marketListingSelect = {
  id: true,
  description: true,
  unitPriceMinor: true,
  minOrderQty: true,
  netWeightPerUnitKg: true,
  harvestDate: true,
  availableFrom: true,
  availableUntil: true,
  status: true,
  stockConfirmedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      variety: true,
      category: { select: { slug: true, name: true } },
    },
  },
  unit: { select: { code: true, name: true, plural: true } },
  grade: { select: { code: true, title: true, description: true } },
  zone: { select: { code: true, name: true } },
  supplier: {
    select: {
      id: true,
      legalName: true,
      tradingName: true,
      supplierKind: true,
      region: true,
      district: true,
      verification: { select: { status: true } },
    },
  },
  images: {
    orderBy: { sortOrder: "asc" },
    select: { storageKey: true, width: true, height: true },
  },
  inventory: { select: { onHand: true, reserved: true } },
} satisfies Prisma.ListingSelect;

type MarketListingRow = Prisma.ListingGetPayload<{
  select: typeof marketListingSelect;
}>;

export type ListingPhoto = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
};

/** Public URLs for a stored listing photo (also used for order thumbnails). */
export function photoUrls(image: {
  storageKey: string;
  width: number;
  height: number;
}): ListingPhoto {
  const base = `/media/${image.storageKey}`;
  return {
    src: `${base}-480.webp`,
    srcSet: `${base}-480.webp 480w, ${base}-1200.webp 1200w`,
    width: image.width,
    height: image.height,
  };
}

function unitLabel(unit: { name: string; plural: string }, qty: string) {
  return qty === "1" ? unit.name : unit.plural;
}

export type MarketListing = {
  id: string;
  productName: string;
  variety: string | null;
  category: { slug: string; name: string };
  description: string | null;
  price: string;
  /** Unit price in pesewas, as a string (bigint doesn't serialise). */
  priceMinor: string;
  unit: { code: string; name: string; plural: string };
  minOrderQty: string;
  minOrderLabel: string;
  netWeightPerUnitKg: string | null;
  harvestDate: Date | null;
  grade: { code: string; title: string; description: string } | null;
  zone: { code: string; name: string };
  supplier: {
    id: string;
    name: string;
    supplierKind: SupplierKind | null;
    region: GhanaRegion;
    district: string | null;
    verified: boolean;
  };
  photos: ListingPhoto[];
  availability: Availability;
};

function toMarketListing(row: MarketListingRow, now: Date): MarketListing {
  const minOrderQty = row.minOrderQty.toString();
  const supplierApproved = row.supplier.verification?.status === "APPROVED";
  return {
    id: row.id,
    productName: row.product.name,
    variety: row.product.variety,
    category: row.product.category,
    description: row.description,
    price: Money.ofMinor(row.unitPriceMinor).format(),
    priceMinor: row.unitPriceMinor.toString(),
    unit: row.unit,
    minOrderQty,
    minOrderLabel: `${minOrderQty} ${unitLabel(row.unit, minOrderQty)}`,
    netWeightPerUnitKg: row.netWeightPerUnitKg?.toString() ?? null,
    harvestDate: row.harvestDate,
    grade: row.grade,
    zone: row.zone,
    supplier: {
      id: row.supplier.id,
      name: row.supplier.tradingName ?? row.supplier.legalName,
      supplierKind: row.supplier.supplierKind,
      region: row.supplier.region,
      district: row.supplier.district,
      verified: supplierApproved,
    },
    photos: row.images.map(photoUrls),
    availability: availabilityOf(
      {
        status: row.status,
        supplierApproved,
        onHand: row.inventory?.onHand.toString() ?? "0",
        reserved: row.inventory?.reserved.toString() ?? "0",
        minOrderQty,
        availableFrom: row.availableFrom,
        availableUntil: row.availableUntil,
      },
      now,
    ),
  };
}

/** Calendar date (as stored in a DATE column) for "YYYY-MM-DD". */
function dateOnly(value: string): Date;
function dateOnly(value: string | undefined): Date | null;
function dateOnly(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function startOfToday(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function isoDate(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "";
}

// ─── Public market ──────────────────────────────────────────────────────────

/** Categories for the market's filter chips. */
export async function listCategories() {
  return db.productCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
}

/**
 * Listings from approved suppliers that anyone may browse. Filters come from
 * the URL, so anything malformed falls back to "no filter" instead of failing.
 */
export async function browseListings(
  input: Record<string, unknown>,
  now = new Date(),
) {
  const parsed = browseSchema.safeParse(input);
  const f: BrowseFilters = parsed.success
    ? parsed.data
    : browseSchema.parse({});

  const and: Prisma.ListingWhereInput[] = [];
  if (f.q) {
    and.push({
      OR: [
        { product: { name: { contains: f.q, mode: "insensitive" } } },
        { product: { variety: { contains: f.q, mode: "insensitive" } } },
        {
          product: {
            category: { name: { contains: f.q, mode: "insensitive" } },
          },
        },
      ],
    });
  }
  if (f.category) and.push({ product: { category: { slug: f.category } } });
  if (f.zone) and.push({ zone: { code: f.zone } });
  if (f.grade) and.push({ grade: { code: f.grade } });
  if (f.minPrice)
    and.push({ unitPriceMinor: { gte: Money.parse(f.minPrice).amountMinor } });
  if (f.maxPrice)
    and.push({ unitPriceMinor: { lte: Money.parse(f.maxPrice).amountMinor } });
  if (f.inStock) {
    const today = startOfToday(now);
    and.push(
      { availableFrom: { lte: today } },
      { OR: [{ availableUntil: null }, { availableUntil: { gte: today } }] },
      { inventory: { onHand: { gt: 0 } } },
    );
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    f.sort === "price_asc"
      ? [{ unitPriceMinor: "asc" }, { id: "asc" }]
      : f.sort === "price_desc"
        ? [{ unitPriceMinor: "desc" }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }];

  const rows = await db.listing.findMany({
    where: { ...PUBLIC_LISTING, AND: and },
    orderBy,
    take: PAGE_SIZE + 1,
    ...(f.cursor ? { cursor: { id: f.cursor }, skip: 1 } : {}),
    select: marketListingSelect,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  let items = page.map((row) => toMarketListing(row, now));
  // Reservations can't be compared with the minimum order in the query above.
  if (f.inStock) items = items.filter((l) => l.availability.available);
  return {
    filters: f,
    items,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/** What ordering needs to know about a listing a buyer wants. */
export type OrderableListing = MarketListing & {
  supplierId: string;
  unitPriceMinor: bigint;
  zoneId: string;
  inventoryId: string | null;
};

/**
 * Listings that are on sale, by ID, for the cart and checkout. A listing that
 * isn't public (paused, archived, supplier suspended) is simply missing from
 * the result. Pass a transaction to read inside checkout.
 */
export async function orderableListings(
  ids: string[],
  now = new Date(),
  client: Tx = db,
): Promise<Map<string, OrderableListing>> {
  const valid = ids.filter((id) => UUID.test(id));
  if (!valid.length) return new Map();
  const rows = await client.listing.findMany({
    where: { id: { in: valid }, ...PUBLIC_LISTING },
    select: {
      ...marketListingSelect,
      unitPriceMinor: true,
      zoneId: true,
      inventory: { select: { id: true, onHand: true, reserved: true } },
    },
  });
  return new Map(
    rows.map((row) => [
      row.id,
      {
        ...toMarketListing(row, now),
        supplierId: row.supplier.id,
        unitPriceMinor: row.unitPriceMinor,
        zoneId: row.zoneId,
        inventoryId: row.inventory?.id ?? null,
      },
    ]),
  );
}

/** One listing plus other approved farms selling the same product, cheapest first. */
export async function getMarketListing(listingId: string, now = new Date()) {
  assertId(listingId, "Listing");
  const row = await db.listing.findFirst({
    where: { id: listingId, ...PUBLIC_LISTING },
    select: { ...marketListingSelect, productId: true },
  });
  if (!row) throw new NotFoundError("This listing isn’t on sale.");
  const others = await db.listing.findMany({
    where: { ...PUBLIC_LISTING, productId: row.productId, id: { not: row.id } },
    orderBy: [{ unitPriceMinor: "asc" }, { id: "asc" }],
    take: 10,
    select: marketListingSelect,
  });
  return {
    listing: toMarketListing(row, now),
    otherOffers: others.map((o) => toMarketListing(o, now)),
  };
}

/** A supplier's public profile. Unapproved or suspended suppliers don't exist publicly. */
export async function getMarketSupplier(supplierId: string, now = new Date()) {
  assertId(supplierId, "Supplier");
  const supplier = await db.organization.findFirst({
    where: { id: supplierId, ...PUBLIC_SUPPLIER },
    select: {
      id: true,
      legalName: true,
      tradingName: true,
      supplierKind: true,
      region: true,
      district: true,
      verification: { select: { decidedAt: true } },
    },
  });
  if (!supplier) throw new NotFoundError("Supplier not found.");
  const listings = await db.listing.findMany({
    where: { ...PUBLIC_LISTING, supplierOrgId: supplier.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 60,
    select: marketListingSelect,
  });
  return {
    id: supplier.id,
    name: supplier.tradingName ?? supplier.legalName,
    supplierKind: supplier.supplierKind,
    region: supplier.region,
    district: supplier.district,
    verifiedSince: supplier.verification?.decidedAt ?? null,
    listings: listings.map((l) => toMarketListing(l, now)),
  };
}

// ─── Staff: listings ────────────────────────────────────────────────────────

/** Everything the "new listing" form needs to offer. */
export async function listingFormOptions(actor: Actor) {
  assertCan(actor, "listing.manage");
  const [suppliers, categories, units, zones] = await Promise.all([
    db.organization.findMany({
      where: PUBLIC_SUPPLIER,
      orderBy: { legalName: "asc" },
      select: { id: true, legalName: true, tradingName: true, region: true },
    }),
    db.productCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        products: {
          where: { isActive: true },
          orderBy: [{ name: "asc" }, { variety: "asc" }],
          select: { id: true, name: true, variety: true },
        },
      },
    }),
    db.unitOfMeasure.findMany({
      orderBy: { sortOrder: "asc" },
      select: { code: true, name: true, plural: true },
    }),
    db.operatingZone.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { code: true, name: true, region: true },
    }),
  ]);
  return {
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.tradingName ?? s.legalName,
      region: s.region,
    })),
    categories,
    units,
    zones,
  };
}

async function resolveListingRefs(
  tx: Tx,
  categoryId: string,
  data: { gradeCode?: string; zoneCode: string },
) {
  const zone = await tx.operatingZone.findFirst({
    where: { code: data.zoneCode, isActive: true },
    select: { id: true, name: true },
  });
  if (!zone) {
    throw new ValidationError("Please check the highlighted fields.", {
      fieldErrors: { zoneCode: "Choose Greater Accra or Kumasi" },
    });
  }
  const grade = data.gradeCode
    ? await tx.gradeDefinition.findUnique({
        where: { categoryId_code: { categoryId, code: data.gradeCode } },
        select: { id: true, code: true },
      })
    : null;
  return { zone, grade };
}

/**
 * Staff list produce for a farm they manage. The stock entered is what buyers
 * can order straight away. Only approved suppliers can have listings.
 */
export async function createListing(actor: Actor, input: CreateListingInput) {
  assertCan(actor, "listing.manage");
  const data = parseInput(createListingSchema, input);

  return db.$transaction(async (tx) => {
    const supplier = await tx.organization.findFirst({
      where: { id: data.supplierId, ...PUBLIC_SUPPLIER },
      select: {
        id: true,
        addresses: {
          where: { kind: "PICKUP", deletedAt: null },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!supplier) {
      throw new ValidationError(
        "Only approved suppliers can sell on DigiFarm.",
        {
          fieldErrors: { supplierId: "Choose an approved supplier" },
        },
      );
    }
    const product = await tx.product.findFirst({
      where: { id: data.productId, isActive: true },
      select: { id: true, categoryId: true },
    });
    if (!product) {
      throw new ValidationError("Please check the highlighted fields.", {
        fieldErrors: { productId: "Choose a product" },
      });
    }
    const unit = await tx.unitOfMeasure.findUnique({
      where: { code: data.unitCode },
      select: { id: true },
    });
    if (!unit) {
      throw new ValidationError("Please check the highlighted fields.", {
        fieldErrors: { unitCode: "Choose a unit" },
      });
    }
    const { zone, grade } = await resolveListingRefs(
      tx,
      product.categoryId,
      data,
    );

    const status: ListingStatus = data.publish ? "ACTIVE" : "DRAFT";
    const listing = await tx.listing.create({
      data: {
        supplierOrgId: supplier.id,
        productId: product.id,
        unitId: unit.id,
        gradeId: grade?.id ?? null,
        zoneId: zone.id,
        pickupAddressId: supplier.addresses[0]?.id ?? null,
        description: data.description,
        unitPriceMinor: Money.parse(data.price).amountMinor,
        minOrderQty: data.minOrderQty,
        netWeightPerUnitKg: data.netWeightPerUnitKg ?? null,
        harvestDate: dateOnly(data.harvestDate),
        availableFrom: dateOnly(data.availableFrom),
        availableUntil: dateOnly(data.availableUntil),
        status,
        stockConfirmedAt: new Date(),
        stockConfirmedById: actor.userId,
        createdById: actor.userId,
      },
    });
    await createInventory(tx, listing.id, data.initialStock, actor);
    await audit(tx, actor, {
      action: "listing.created",
      entityType: "Listing",
      entityId: listing.id,
      onBehalfOfOrgId: supplier.id,
      after: {
        productId: product.id,
        price: data.price,
        unit: data.unitCode,
        grade: grade?.code ?? null,
        zone: data.zoneCode,
        minOrderQty: data.minOrderQty,
        stock: data.initialStock,
        status,
      },
    });
    return listing;
  });
}

const editableSelect = {
  id: true,
  supplierOrgId: true,
  status: true,
  unitPriceMinor: true,
  minOrderQty: true,
  netWeightPerUnitKg: true,
  harvestDate: true,
  availableFrom: true,
  availableUntil: true,
  description: true,
  grade: { select: { code: true } },
  zone: { select: { code: true } },
  product: { select: { categoryId: true } },
} satisfies Prisma.ListingSelect;

function editableSnapshot(
  l: Prisma.ListingGetPayload<{ select: typeof editableSelect }>,
) {
  return {
    price: Money.ofMinor(l.unitPriceMinor).toMajorString(),
    minOrderQty: l.minOrderQty.toString(),
    netWeightPerUnitKg: l.netWeightPerUnitKg?.toString() ?? null,
    grade: l.grade?.code ?? null,
    zone: l.zone.code,
    harvestDate: isoDate(l.harvestDate) || null,
    availableFrom: isoDate(l.availableFrom),
    availableUntil: isoDate(l.availableUntil) || null,
    description: l.description,
  };
}

/** Price, grade, dates and other details. Every change is audited with before/after values. */
export async function updateListing(
  actor: Actor,
  listingId: string,
  input: UpdateListingInput,
) {
  assertCan(actor, "listing.manage");
  assertId(listingId, "Listing");
  const data = parseInput(updateListingSchema, input);

  return db.$transaction(async (tx) => {
    const current = await tx.listing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: editableSelect,
    });
    if (!current) throw new NotFoundError("Listing not found.");
    if (current.status === "ARCHIVED") {
      throw new ConflictError("Archived listings can’t be changed.");
    }
    const { zone, grade } = await resolveListingRefs(
      tx,
      current.product.categoryId,
      data,
    );
    const updated = await tx.listing.update({
      where: { id: listingId },
      data: {
        unitPriceMinor: Money.parse(data.price).amountMinor,
        minOrderQty: data.minOrderQty,
        netWeightPerUnitKg: data.netWeightPerUnitKg ?? null,
        gradeId: grade?.id ?? null,
        zoneId: zone.id,
        harvestDate: dateOnly(data.harvestDate),
        availableFrom: dateOnly(data.availableFrom),
        availableUntil: dateOnly(data.availableUntil),
        description: data.description ?? null,
      },
      select: editableSelect,
    });
    await audit(tx, actor, {
      action: "listing.updated",
      entityType: "Listing",
      entityId: listingId,
      onBehalfOfOrgId: current.supplierOrgId,
      before: editableSnapshot(current),
      after: editableSnapshot(updated),
    });
    return updated;
  });
}

/**
 * Staff set the stock buyers can order, e.g. after checking with the farmer.
 * Also records when stock was last updated, for the staff reminder list.
 */
export async function confirmStock(
  actor: Actor,
  listingId: string,
  input: ConfirmStockInput,
) {
  assertCan(actor, "stock.confirm");
  assertId(listingId, "Listing");
  const data = parseInput(confirmStockSchema, input);

  return db.$transaction(async (tx) => {
    const listing = await tx.listing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: {
        id: true,
        status: true,
        supplierOrgId: true,
        stockConfirmedAt: true,
      },
    });
    if (!listing) throw new NotFoundError("Listing not found.");
    if (listing.status === "ARCHIVED") {
      throw new ConflictError("Archived listings can’t take stock updates.");
    }
    const stock = await setOnHand(
      tx,
      listingId,
      data.onHand,
      actor,
      data.note ?? "Stock updated",
    );
    const confirmedAt = new Date();
    await tx.listing.update({
      where: { id: listingId },
      data: { stockConfirmedAt: confirmedAt, stockConfirmedById: actor.userId },
    });
    await audit(tx, actor, {
      action: "listing.stock_confirmed",
      entityType: "Listing",
      entityId: listingId,
      onBehalfOfOrgId: listing.supplierOrgId,
      before: {
        onHand: stock.before,
        stockConfirmedAt: listing.stockConfirmedAt?.toISOString() ?? null,
      },
      after: {
        onHand: stock.after,
        stockConfirmedAt: confirmedAt.toISOString(),
        note: data.note ?? null,
      },
    });
    return stock;
  });
}

/** Publish, pause, resume or archive. Pausing and archiving need a reason. */
export async function changeListingStatus(
  actor: Actor,
  listingId: string,
  input: ListingStatusChangeInput,
) {
  assertCan(actor, "listing.manage");
  assertId(listingId, "Listing");
  const data = parseInput(listingStatusChangeSchema, input);

  return db.$transaction(async (tx) => {
    // Lock the row so two staff members can't change it at the same moment.
    const [locked] = await tx.$queryRaw<
      { id: string; status: ListingStatus; supplierOrgId: string }[]
    >`
      SELECT id, status, "supplierOrgId" FROM "listing"
      WHERE id = ${listingId}::uuid AND "deletedAt" IS NULL
      FOR UPDATE`;
    if (!locked) throw new NotFoundError("Listing not found.");

    const next = nextListingStatus(locked.status, data.action);
    if (!next) {
      throw new ConflictError(
        `This listing can’t be ${data.action.toLowerCase()}d from its current status.`,
      );
    }
    if (next === "ACTIVE") {
      const approved = await tx.organization.count({
        where: { id: locked.supplierOrgId, ...PUBLIC_SUPPLIER },
      });
      if (!approved) {
        throw new ConflictError(
          "This supplier isn’t approved, so its produce can’t go on sale.",
        );
      }
    }
    await tx.listing.update({
      where: { id: listingId },
      data: { status: next, statusReason: data.reason ?? null },
    });
    await audit(tx, actor, {
      action: `listing.${data.action.toLowerCase()}`,
      entityType: "Listing",
      entityId: listingId,
      onBehalfOfOrgId: locked.supplierOrgId,
      before: { status: locked.status },
      after: { status: next, reason: data.reason ?? null },
    });
    return next;
  });
}

export type PhotoUpload = { bytes: Uint8Array; size: number };

/** Product photos: resized to WebP with location and camera metadata removed, then public. */
export async function addListingPhotos(
  actor: Actor,
  listingId: string,
  photos: PhotoUpload[],
) {
  assertCan(actor, "listing.manage");
  assertId(listingId, "Listing");
  if (photos.length === 0)
    throw new ValidationError("Choose at least one photo.");

  const listing = await db.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: {
      id: true,
      supplierOrgId: true,
      _count: { select: { images: true } },
    },
  });
  if (!listing) throw new NotFoundError("Listing not found.");
  if (listing._count.images + photos.length > MAX_PHOTOS_PER_LISTING) {
    throw new ValidationError(
      `A listing can have at most ${MAX_PHOTOS_PER_LISTING} photos.`,
    );
  }
  photos.forEach((p, i) => {
    if (p.size > MAX_PHOTO_BYTES)
      throw new ValidationError(`Photo ${i + 1} is larger than 8 MB.`);
  });

  // Process every photo before storing any, so one bad file stores nothing.
  const processed = [];
  for (const [i, photo] of photos.entries()) {
    try {
      processed.push(await processListingPhoto(photo.bytes));
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Photo ${i + 1}: ${error.message}`);
      }
      throw error;
    }
  }
  const storage = publicStorage();
  const stored = await Promise.all(
    processed.map(async (p) => {
      const storageKey = `listings/${randomUUID()}`;
      await storage.put(`${storageKey}-480.webp`, p.variants[480]);
      await storage.put(`${storageKey}-1200.webp`, p.variants[1200]);
      return { storageKey, width: p.width, height: p.height };
    }),
  );

  return db.$transaction(async (tx) => {
    const last = await tx.listingImage.findFirst({
      where: { listingId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const start = (last?.sortOrder ?? -1) + 1;
    await tx.listingImage.createMany({
      data: stored.map((s, i) => ({ ...s, listingId, sortOrder: start + i })),
    });
    await audit(tx, actor, {
      action: "listing.photos_added",
      entityType: "Listing",
      entityId: listingId,
      onBehalfOfOrgId: listing.supplierOrgId,
      after: { photos: stored.length },
    });
  });
}

export async function removeListingPhoto(
  actor: Actor,
  listingId: string,
  imageId: string,
) {
  assertCan(actor, "listing.manage");
  assertId(listingId, "Listing");
  assertId(imageId, "Photo");
  return db.$transaction(async (tx) => {
    const image = await tx.listingImage.findFirst({
      where: { id: imageId, listingId },
      select: {
        id: true,
        storageKey: true,
        listing: { select: { supplierOrgId: true } },
      },
    });
    if (!image) throw new NotFoundError("Photo not found.");
    await tx.listingImage.delete({ where: { id: image.id } });
    await audit(tx, actor, {
      action: "listing.photo_removed",
      entityType: "Listing",
      entityId: listingId,
      onBehalfOfOrgId: image.listing.supplierOrgId,
      before: { storageKey: image.storageKey },
    });
  });
}

export const STAFF_LISTING_VIEWS = [
  "stale",
  "ACTIVE",
  "DRAFT",
  "PAUSED",
  "ARCHIVED",
] as const;
export type StaffListingView = (typeof STAFF_LISTING_VIEWS)[number];

function staleWhere(now: Date): Prisma.ListingWhereInput {
  return {
    status: "ACTIVE",
    deletedAt: null,
    OR: [
      { stockConfirmedAt: null },
      { stockConfirmedAt: { lt: stockReminderCutoff(now) } },
    ],
  };
}

const staffListingSelect = {
  ...marketListingSelect,
  statusReason: true,
  updatedAt: true,
  supplier: {
    select: {
      ...marketListingSelect.supplier.select,
      phone: true,
    },
  },
} satisfies Prisma.ListingSelect;

function toStaffListing(
  row: Prisma.ListingGetPayload<{ select: typeof staffListingSelect }>,
  now: Date,
) {
  return {
    ...toMarketListing(row, now),
    status: row.status,
    statusReason: row.statusReason,
    supplierPhone: row.supplier.phone,
    stockConfirmedAt: row.stockConfirmedAt,
    onHand: row.inventory?.onHand.toString() ?? "0",
    reserved: row.inventory?.reserved.toString() ?? "0",
  };
}

/**
 * Listings for the staff console. "stale" is a reminder list: listings on sale
 * whose stock hasn't been updated in 3 days, oldest update first. Buyers can
 * still order them.
 */
export async function listListingsForStaff(
  actor: Actor,
  opts: {
    view?: StaffListingView;
    supplierId?: string;
    q?: string;
    cursor?: string;
  } = {},
  now = new Date(),
) {
  assertCan(actor, "listing.manage");
  const where: Prisma.ListingWhereInput =
    opts.view === "stale"
      ? staleWhere(now)
      : {
          deletedAt: null,
          status: opts.view ?? { not: "ARCHIVED" },
        };
  if (opts.supplierId) {
    assertId(opts.supplierId, "Supplier");
    where.supplierOrgId = opts.supplierId;
  }
  if (opts.q) {
    where.AND = [
      {
        OR: [
          { product: { name: { contains: opts.q, mode: "insensitive" } } },
          {
            supplier: { legalName: { contains: opts.q, mode: "insensitive" } },
          },
          {
            supplier: {
              tradingName: { contains: opts.q, mode: "insensitive" },
            },
          },
        ],
      },
    ];
  }

  if (opts.view === "stale") {
    const rows = await db.listing.findMany({
      where,
      orderBy: [
        { stockConfirmedAt: { sort: "asc", nulls: "first" } },
        { id: "asc" },
      ],
      take: 100,
      select: staffListingSelect,
    });
    return { items: rows.map((r) => toStaffListing(r, now)), nextCursor: null };
  }

  const rows = await db.listing.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: staffListingSelect,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  return {
    items: items.map((r) => toStaffListing(r, now)),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

export async function countStaleListings(actor: Actor, now = new Date()) {
  assertCan(actor, "listing.manage");
  return db.listing.count({ where: staleWhere(now) });
}

/** One listing with everything staff need: stock history, photos, allowed status changes. */
export async function getListingForStaff(
  actor: Actor,
  listingId: string,
  now = new Date(),
) {
  assertCan(actor, "listing.manage");
  assertId(listingId, "Listing");
  const row = await db.listing.findFirst({
    where: { id: listingId, deletedAt: null },
    select: {
      ...staffListingSelect,
      createdAt: true,
      createdBy: { select: { name: true } },
      stockConfirmedBy: { select: { name: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, storageKey: true, width: true, height: true },
      },
      inventory: {
        select: {
          onHand: true,
          reserved: true,
          movements: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              type: true,
              quantity: true,
              onHandAfter: true,
              reason: true,
              createdAt: true,
              actor: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!row) throw new NotFoundError("Listing not found.");
  return {
    ...toStaffListing(row, now),
    createdAt: row.createdAt,
    createdBy: row.createdBy.name,
    stockConfirmedBy: row.stockConfirmedBy?.name ?? null,
    photoItems: row.images.map((img) => ({ id: img.id, ...photoUrls(img) })),
    movements: (row.inventory?.movements ?? []).map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity.toString(),
      onHandAfter: m.onHandAfter.toString(),
      reason: m.reason,
      createdAt: m.createdAt,
      by: m.actor?.name ?? "System",
    })),
    allowedActions: allowedListingActions(row.status),
    /** Current values in the shape the edit form expects. */
    form: {
      price: Money.ofMinor(row.unitPriceMinor).toMajorString(),
      minOrderQty: row.minOrderQty.toString(),
      netWeightPerUnitKg: row.netWeightPerUnitKg?.toString() ?? "",
      gradeCode: (row.grade?.code ?? "") as "" | "A" | "B" | "C",
      zoneCode: row.zone.code as "ACCRA" | "KUMASI",
      harvestDate: isoDate(row.harvestDate),
      availableFrom: isoDate(row.availableFrom),
      availableUntil: isoDate(row.availableUntil),
      description: row.description ?? "",
    },
  };
}

// ─── Grades ─────────────────────────────────────────────────────────────────

/** DigiFarm's A/B/C grade wording per category. Staff read it; admins edit it. */
export async function listGrades(actor: Actor) {
  assertCan(actor, "listing.manage");
  return db.productCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      grades: {
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          updatedAt: true,
          updatedBy: { select: { name: true } },
        },
      },
    },
  });
}

export async function updateGrade(
  actor: Actor,
  gradeId: string,
  input: GradeUpdateInput,
) {
  assertCan(actor, "grade.manage");
  assertId(gradeId, "Grade");
  const data = parseInput(gradeUpdateSchema, input);
  return db.$transaction(async (tx) => {
    const before = await tx.gradeDefinition.findUnique({
      where: { id: gradeId },
      select: { title: true, description: true },
    });
    if (!before) throw new NotFoundError("Grade not found.");
    await tx.gradeDefinition.update({
      where: { id: gradeId },
      data: { ...data, updatedById: actor.userId },
    });
    await audit(tx, actor, {
      action: "grade.updated",
      entityType: "GradeDefinition",
      entityId: gradeId,
      before,
      after: data,
    });
  });
}
