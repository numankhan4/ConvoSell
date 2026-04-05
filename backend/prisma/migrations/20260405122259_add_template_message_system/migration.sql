-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "quotaResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "templateMessagesLimit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "templateMessagesUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "whatsapp_message_templates" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'UTILITY',
    "language" TEXT NOT NULL DEFAULT 'en',
    "headerType" TEXT,
    "headerText" TEXT,
    "headerMediaUrl" TEXT,
    "bodyText" TEXT NOT NULL,
    "footerText" TEXT,
    "buttons" JSONB DEFAULT '[]',
    "variables" JSONB DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metaTemplateId" TEXT,
    "rejectionReason" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_messages" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "contactId" TEXT,
    "orderId" TEXT,
    "headerParams" JSONB DEFAULT '[]',
    "bodyParams" JSONB NOT NULL DEFAULT '[]',
    "buttonParams" JSONB DEFAULT '[]',
    "whatsappMessageId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_templates_metaTemplateId_key" ON "whatsapp_message_templates"("metaTemplateId");

-- CreateIndex
CREATE INDEX "whatsapp_message_templates_workspaceId_status_idx" ON "whatsapp_message_templates"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_templates_workspaceId_name_language_key" ON "whatsapp_message_templates"("workspaceId", "name", "language");

-- CreateIndex
CREATE UNIQUE INDEX "template_messages_whatsappMessageId_key" ON "template_messages"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "template_messages_workspaceId_createdAt_idx" ON "template_messages"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "template_messages_templateId_idx" ON "template_messages"("templateId");

-- CreateIndex
CREATE INDEX "template_messages_status_idx" ON "template_messages"("status");

-- CreateIndex
CREATE INDEX "template_messages_recipientPhone_idx" ON "template_messages"("recipientPhone");

-- CreateIndex
CREATE INDEX "workspaces_subscriptionStatus_idx" ON "workspaces"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "workspaces_quotaResetAt_idx" ON "workspaces"("quotaResetAt");

-- AddForeignKey
ALTER TABLE "whatsapp_message_templates" ADD CONSTRAINT "whatsapp_message_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_messages" ADD CONSTRAINT "template_messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_messages" ADD CONSTRAINT "template_messages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "whatsapp_message_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
