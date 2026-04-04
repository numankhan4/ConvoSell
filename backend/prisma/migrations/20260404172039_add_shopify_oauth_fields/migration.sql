-- AlterTable
ALTER TABLE "shopify_stores" ADD COLUMN     "oauth_access_token" TEXT,
ADD COLUMN     "oauth_installed_at" TIMESTAMP(3),
ADD COLUMN     "token_type" TEXT DEFAULT 'client-credentials',
ADD COLUMN     "uninstalled_at" TIMESTAMP(3),
ALTER COLUMN "scopes" DROP NOT NULL,
ALTER COLUMN "clientId" DROP NOT NULL,
ALTER COLUMN "clientSecret" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "shopify_stores_token_type_idx" ON "shopify_stores"("token_type");
