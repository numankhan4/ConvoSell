-- CreateTable
CREATE TABLE "fraud_rule_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "rolloutMode" TEXT NOT NULL DEFAULT 'shadow',
    "approveMaxThreshold" INTEGER NOT NULL DEFAULT 29,
    "verifyMaxThreshold" INTEGER NOT NULL DEFAULT 69,
    "blockMinThreshold" INTEGER NOT NULL DEFAULT 70,
    "duplicateWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "phoneWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "codWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "geoWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "trustWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "maxSingleContribution" INTEGER NOT NULL DEFAULT 35,
    "requireTwoHighSignals" BOOLEAN NOT NULL DEFAULT true,
    "highSignalThreshold" INTEGER NOT NULL DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fraud_rule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_assessments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "duplicateScore" INTEGER NOT NULL DEFAULT 0,
    "phoneRiskScore" INTEGER NOT NULL DEFAULT 0,
    "codRiskScore" INTEGER NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "geoRiskScore" INTEGER NOT NULL DEFAULT 0,
    "finalFraudScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "fraudDecision" TEXT NOT NULL,
    "explanation" JSONB NOT NULL DEFAULT '[]',
    "detectorBreakdown" JSONB NOT NULL DEFAULT '{}',
    "recommendedAction" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'rules-v1',
    "processingTimeMs" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fraud_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_signals" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "detectorName" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "scoreContribution" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_fingerprints" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "ordersLast24h" INTEGER NOT NULL DEFAULT 0,
    "ordersLast7d" INTEGER NOT NULL DEFAULT 0,
    "uniqueNamesLast7d" INTEGER NOT NULL DEFAULT 0,
    "uniqueAddressesLast7d" INTEGER NOT NULL DEFAULT 0,
    "cancellationRatio7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_fingerprints" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "ordersLast24h" INTEGER NOT NULL DEFAULT 0,
    "ordersLast7d" INTEGER NOT NULL DEFAULT 0,
    "uniquePhonesLast7d" INTEGER NOT NULL DEFAULT 0,
    "uniqueNamesLast7d" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_fingerprints" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "ordersLast24h" INTEGER NOT NULL DEFAULT 0,
    "ordersLast7d" INTEGER NOT NULL DEFAULT 0,
    "uniquePhonesLast7d" INTEGER NOT NULL DEFAULT 0,
    "uniqueAddressesLast7d" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_decision_audits" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "previousDecision" TEXT,
    "newDecision" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'system',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_decision_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fraud_rule_configs_workspaceId_key" ON "fraud_rule_configs"("workspaceId");

-- CreateIndex
CREATE INDEX "fraud_assessments_workspaceId_createdAt_idx" ON "fraud_assessments"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "fraud_assessments_workspaceId_finalFraudScore_createdAt_idx" ON "fraud_assessments"("workspaceId", "finalFraudScore", "createdAt");

-- CreateIndex
CREATE INDEX "fraud_assessments_orderId_checkedAt_idx" ON "fraud_assessments"("orderId", "checkedAt");

-- CreateIndex
CREATE INDEX "fraud_signals_workspaceId_createdAt_idx" ON "fraud_signals"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "fraud_signals_orderId_createdAt_idx" ON "fraud_signals"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "phone_fingerprints_workspaceId_lastSeenAt_idx" ON "phone_fingerprints"("workspaceId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "phone_fingerprints_workspaceId_normalizedPhone_key" ON "phone_fingerprints"("workspaceId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "address_fingerprints_workspaceId_lastSeenAt_idx" ON "address_fingerprints"("workspaceId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "address_fingerprints_workspaceId_addressHash_key" ON "address_fingerprints"("workspaceId", "addressHash");

-- CreateIndex
CREATE INDEX "device_fingerprints_workspaceId_lastSeenAt_idx" ON "device_fingerprints"("workspaceId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_fingerprints_workspaceId_deviceKey_key" ON "device_fingerprints"("workspaceId", "deviceKey");

-- CreateIndex
CREATE INDEX "fraud_decision_audits_workspaceId_createdAt_idx" ON "fraud_decision_audits"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "fraud_decision_audits_orderId_createdAt_idx" ON "fraud_decision_audits"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "fraud_rule_configs" ADD CONSTRAINT "fraud_rule_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_assessments" ADD CONSTRAINT "fraud_assessments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_assessments" ADD CONSTRAINT "fraud_assessments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "fraud_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_fingerprints" ADD CONSTRAINT "phone_fingerprints_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address_fingerprints" ADD CONSTRAINT "address_fingerprints_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_fingerprints" ADD CONSTRAINT "device_fingerprints_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_decision_audits" ADD CONSTRAINT "fraud_decision_audits_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_decision_audits" ADD CONSTRAINT "fraud_decision_audits_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_decision_audits" ADD CONSTRAINT "fraud_decision_audits_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "fraud_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
