-- AlterTable
ALTER TABLE "shopify_stores" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "whatsapp_integrations" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT;
