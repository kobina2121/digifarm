-- CreateTable
CREATE TABLE "saved_listing" (
    "id" UUID NOT NULL,
    "buyerOrgId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_listing_buyerOrgId_createdAt_idx" ON "saved_listing"("buyerOrgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_listing_buyerOrgId_listingId_key" ON "saved_listing"("buyerOrgId", "listingId");

-- AddForeignKey
ALTER TABLE "saved_listing" ADD CONSTRAINT "saved_listing_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_listing" ADD CONSTRAINT "saved_listing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
