-- Trigram matching for product search (Neon and standard Postgres ship this extension).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('MASS', 'COUNT', 'CONTAINER', 'BUNDLE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('ADJUST', 'RESERVE', 'RELEASE', 'COMMIT', 'RETURN');

-- CreateTable
CREATE TABLE "unit_of_measure" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plural" TEXT NOT NULL,
    "kind" "UnitKind" NOT NULL,
    "factorToBase" DECIMAL(14,3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "unit_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_definition" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "variety" TEXT,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing" (
    "id" UUID NOT NULL,
    "supplierOrgId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "gradeId" UUID,
    "zoneId" UUID NOT NULL,
    "pickupAddressId" UUID,
    "description" TEXT,
    "unitPriceMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "minOrderQty" DECIMAL(14,3) NOT NULL,
    "netWeightPerUnitKg" DECIMAL(10,3),
    "harvestDate" DATE,
    "availableFrom" DATE NOT NULL,
    "availableUntil" DATE,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "statusReason" TEXT,
    "stockConfirmedAt" TIMESTAMP(3),
    "stockConfirmedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_image" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_record" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "onHand" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement" (
    "id" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "onHandAfter" DECIMAL(14,3) NOT NULL,
    "reason" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measure_code_key" ON "unit_of_measure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_slug_key" ON "product_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "grade_definition_categoryId_code_key" ON "grade_definition"("categoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");

-- CreateIndex
CREATE INDEX "product_name_trgm_idx" ON "product" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE INDEX "listing_status_productId_idx" ON "listing"("status", "productId");

-- CreateIndex
CREATE INDEX "listing_status_zoneId_idx" ON "listing"("status", "zoneId");

-- CreateIndex
CREATE INDEX "listing_supplierOrgId_idx" ON "listing"("supplierOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_image_storageKey_key" ON "listing_image"("storageKey");

-- CreateIndex
CREATE INDEX "listing_image_listingId_sortOrder_idx" ON "listing_image"("listingId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_record_listingId_key" ON "inventory_record"("listingId");

-- CreateIndex
CREATE INDEX "inventory_movement_inventoryId_createdAt_idx" ON "inventory_movement"("inventoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "grade_definition" ADD CONSTRAINT "grade_definition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_definition" ADD CONSTRAINT "grade_definition_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grade_definition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "operating_zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_pickupAddressId_fkey" FOREIGN KEY ("pickupAddressId") REFERENCES "address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_stockConfirmedById_fkey" FOREIGN KEY ("stockConfirmedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_image" ADD CONSTRAINT "listing_image_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_record" ADD CONSTRAINT "inventory_record_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stock can never go negative, and reservations can never exceed stock (ROADMAP §2.4).
ALTER TABLE "inventory_record"
  ADD CONSTRAINT "inventory_on_hand_non_negative" CHECK ("onHand" >= 0),
  ADD CONSTRAINT "inventory_reserved_within_stock" CHECK ("reserved" >= 0 AND "reserved" <= "onHand");

ALTER TABLE "listing"
  ADD CONSTRAINT "listing_price_positive" CHECK ("unitPriceMinor" > 0),
  ADD CONSTRAINT "listing_moq_positive" CHECK ("minOrderQty" > 0),
  ADD CONSTRAINT "listing_dates_ordered" CHECK ("availableUntil" IS NULL OR "availableUntil" >= "availableFrom");

-- Stock history is append-only, like the audit log.
CREATE FUNCTION forbid_inventory_movement_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'inventory_movement is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_movement_append_only
  BEFORE UPDATE OR DELETE ON "inventory_movement"
  FOR EACH ROW EXECUTE FUNCTION forbid_inventory_movement_change();

CREATE TRIGGER inventory_movement_no_truncate
  BEFORE TRUNCATE ON "inventory_movement"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_inventory_movement_change();
