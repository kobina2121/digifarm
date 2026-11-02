-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('MOBILE_MONEY', 'BANK_TRANSFER', 'CASH');

-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'SUPPLIER_PAYOUT';

-- CreateTable
CREATE TABLE "supplier_payout" (
    "id" UUID NOT NULL,
    "fulfilmentId" UUID NOT NULL,
    "supplierOrgId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "paidTo" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payout_fulfilmentId_key" ON "supplier_payout"("fulfilmentId");

-- CreateIndex
CREATE INDEX "supplier_payout_supplierOrgId_createdAt_idx" ON "supplier_payout"("supplierOrgId", "createdAt");

-- CreateIndex
CREATE INDEX "supplier_payout_createdAt_idx" ON "supplier_payout"("createdAt");

-- AddForeignKey
ALTER TABLE "supplier_payout" ADD CONSTRAINT "supplier_payout_fulfilmentId_fkey" FOREIGN KEY ("fulfilmentId") REFERENCES "fulfilment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payout" ADD CONSTRAINT "supplier_payout_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payout" ADD CONSTRAINT "supplier_payout_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
