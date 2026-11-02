-- AlterEnum
ALTER TYPE "FulfilmentStatus" ADD VALUE 'DELIVERY_FAILED';

-- AlterTable
ALTER TABLE "fulfilment" ADD COLUMN     "carrierDetails" TEXT,
ADD COLUMN     "carrierName" TEXT,
ADD COLUMN     "carrierPhone" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryFailReason" TEXT,
ADD COLUMN     "deliveryFailedAt" TIMESTAMP(3),
ADD COLUMN     "pickedUpAt" TIMESTAMP(3),
ADD COLUMN     "proofMimeType" TEXT,
ADD COLUMN     "proofStorageKey" TEXT,
ADD COLUMN     "receiverName" TEXT;
