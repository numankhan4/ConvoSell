/*
  Warnings:

  - Added the required column `clientId` to the `shopify_stores` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientSecret` to the `shopify_stores` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "shopify_stores" ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "clientSecret" TEXT NOT NULL,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ALTER COLUMN "accessToken" DROP NOT NULL;
