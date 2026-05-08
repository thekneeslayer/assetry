/*
  Warnings:

  - Added the required column `sellerId` to the `Purchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "salesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sellerAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sellerUsername" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "fileUrl" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "buyerAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "listingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "listingTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sellerAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sellerId" TEXT NOT NULL,
ADD COLUMN     "txHash" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
