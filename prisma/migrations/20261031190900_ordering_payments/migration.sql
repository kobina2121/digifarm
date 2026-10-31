-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('MARKETPLACE', 'MANAGED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'IN_FULFILMENT', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FulfilmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'ABANDONED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('INITIATED', 'SUCCEEDED', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('PAYMENT_CAPTURED', 'PROVIDER_FEE', 'SUPPLIER_PAYABLE', 'COMMISSION', 'DELIVERY_FEE', 'REFUND');

-- CreateTable
CREATE TABLE "cart" (
    "id" UUID NOT NULL,
    "buyerOrgId" UUID NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "buyerOrgId" UUID NOT NULL,
    "placedById" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL DEFAULT 'MARKETPLACE',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "subtotalMinor" BIGINT NOT NULL,
    "deliveryFeeMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "zoneId" UUID NOT NULL,
    "deliveryAddressSnapshot" JSONB NOT NULL,
    "buyerNotes" TEXT,
    "holdExpiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfilment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "supplierOrgId" UUID NOT NULL,
    "supplierName" TEXT NOT NULL,
    "status" "FulfilmentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotalMinor" BIGINT NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfilment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fulfilmentId" UUID NOT NULL,
    "listingId" UUID,
    "productName" TEXT NOT NULL,
    "variety" TEXT,
    "gradeCode" TEXT,
    "unitCode" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitPlural" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPriceMinor" BIGINT NOT NULL,
    "lineTotalMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "from" "OrderStatus",
    "to" "OrderStatus" NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservation" (
    "id" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "feeMinor" BIGINT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempt" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "authorizationUrl" TEXT,
    "providerTransactionId" TEXT,
    "channel" TEXT,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "rawStatus" TEXT,
    "failureReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_event" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "failureReason" TEXT,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" UUID NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "orderId" UUID,
    "fulfilmentId" UUID,
    "supplierOrgId" UUID,
    "paymentId" UUID,
    "refundId" UUID,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cart_buyerOrgId_key" ON "cart"("buyerOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cartId_listingId_key" ON "cart_item"("cartId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "order_number_key" ON "order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "order_idempotencyKey_key" ON "order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "order_buyerOrgId_createdAt_idx" ON "order"("buyerOrgId", "createdAt");

-- CreateIndex
CREATE INDEX "order_status_holdExpiresAt_idx" ON "order"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "fulfilment_supplierOrgId_status_idx" ON "fulfilment"("supplierOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fulfilment_orderId_supplierOrgId_key" ON "fulfilment"("orderId", "supplierOrgId");

-- CreateIndex
CREATE INDEX "order_item_orderId_idx" ON "order_item"("orderId");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservation_orderItemId_key" ON "stock_reservation"("orderItemId");

-- CreateIndex
CREATE INDEX "stock_reservation_status_expiresAt_idx" ON "stock_reservation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "stock_reservation_inventoryId_status_idx" ON "stock_reservation"("inventoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_orderId_key" ON "payment"("orderId");

-- CreateIndex
CREATE INDEX "payment_attempt_paymentId_idx" ON "payment_attempt"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempt_provider_reference_key" ON "payment_attempt"("provider", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "provider_event_provider_eventId_key" ON "provider_event"("provider", "eventId");

-- CreateIndex
CREATE INDEX "refund_paymentId_idx" ON "refund"("paymentId");

-- CreateIndex
CREATE INDEX "refund_status_idx" ON "refund"("status");

-- CreateIndex
CREATE INDEX "ledger_entry_orderId_idx" ON "ledger_entry"("orderId");

-- CreateIndex
CREATE INDEX "ledger_entry_supplierOrgId_type_idx" ON "ledger_entry"("supplierOrgId", "type");

-- CreateIndex
CREATE INDEX "ledger_entry_type_createdAt_idx" ON "ledger_entry"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment" ADD CONSTRAINT "fulfilment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment" ADD CONSTRAINT "fulfilment_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_fulfilmentId_fkey" FOREIGN KEY ("fulfilmentId") REFERENCES "fulfilment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservation" ADD CONSTRAINT "stock_reservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempt" ADD CONSTRAINT "payment_attempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_fulfilmentId_fkey" FOREIGN KEY ("fulfilmentId") REFERENCES "fulfilment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Human-readable order numbers (DF-2026-000123) from one sequence, so they never collide.
CREATE SEQUENCE "order_number_seq" START 1;

-- Money and quantities are never negative or empty where that would be meaningless (ROADMAP §2.4).
ALTER TABLE "cart_item"
  ADD CONSTRAINT "cart_item_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "order"
  ADD CONSTRAINT "order_amounts_non_negative" CHECK ("subtotalMinor" >= 0 AND "deliveryFeeMinor" >= 0),
  ADD CONSTRAINT "order_total_adds_up" CHECK ("totalMinor" = "subtotalMinor" + "deliveryFeeMinor");

ALTER TABLE "fulfilment"
  ADD CONSTRAINT "fulfilment_commission_range" CHECK ("commissionBps" BETWEEN 0 AND 10000);

ALTER TABLE "order_item"
  ADD CONSTRAINT "order_item_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_item_price_positive" CHECK ("unitPriceMinor" > 0 AND "lineTotalMinor" > 0);

ALTER TABLE "stock_reservation"
  ADD CONSTRAINT "stock_reservation_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "payment"
  ADD CONSTRAINT "payment_amount_positive" CHECK ("amountMinor" > 0);

ALTER TABLE "refund"
  ADD CONSTRAINT "refund_amount_positive" CHECK ("amountMinor" > 0);

-- The ledger is append-only, like the audit log: corrections are reversing entries.
CREATE FUNCTION forbid_ledger_entry_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entry is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entry_append_only
  BEFORE UPDATE OR DELETE ON "ledger_entry"
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_entry_change();

CREATE TRIGGER ledger_entry_no_truncate
  BEFORE TRUNCATE ON "ledger_entry"
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_ledger_entry_change();
