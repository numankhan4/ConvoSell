-- AlterTable
ALTER TABLE "whatsapp_integrations" ADD COLUMN     "healthError" TEXT,
ADD COLUMN     "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "lastHealthCheck" TIMESTAMP(3),
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenType" TEXT NOT NULL DEFAULT 'temporary';

-- CreateIndex
CREATE INDEX "whatsapp_integrations_tokenExpiresAt_idx" ON "whatsapp_integrations"("tokenExpiresAt");
