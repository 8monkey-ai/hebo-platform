/*
  Warnings:

  - Added the required column `referenceId` to the `apikeys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "apikeys" ADD COLUMN     "configId" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "referenceId" TEXT;

-- Backfill referenceId from existing userId
UPDATE "apikeys" SET "referenceId" = "userId" WHERE "referenceId" IS NULL;

-- Make referenceId required
ALTER TABLE "apikeys" ALTER COLUMN "referenceId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "apikeys_configId_idx" ON "apikeys"("configId");

-- CreateIndex
CREATE INDEX "apikeys_referenceId_idx" ON "apikeys"("referenceId");
