/*
  Warnings:

  - Added the required column `attemptId` to the `refund` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refund" ADD COLUMN     "attemptId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "payment_attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
