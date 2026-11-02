-- DropForeignKey
ALTER TABLE "listing" DROP CONSTRAINT "listing_zoneId_fkey";

-- AlterTable
ALTER TABLE "listing" ALTER COLUMN "zoneId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "zoneId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "operating_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
