-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "feedbackReason" TEXT,
ADD COLUMN     "responseTimeMinutes" INTEGER,
ADD COLUMN     "shopifyCancelled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shopifyFulfillmentId" TEXT;
