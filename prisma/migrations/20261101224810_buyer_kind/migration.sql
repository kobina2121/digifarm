-- CreateEnum
CREATE TYPE "BuyerKind" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "buyerKind" "BuyerKind";

-- Every buyer before D18 signed up as a business.
UPDATE "organization" SET "buyerKind" = 'BUSINESS' WHERE "type" = 'BUYER';
