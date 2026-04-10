-- Order verification policy settings (workspace level)
ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "verificationEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "verificationScope" TEXT NOT NULL DEFAULT 'cod_only',
  ADD COLUMN IF NOT EXISTS "verificationFirstFollowupMinutes" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS "verificationFinalTimeoutMinutes" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS "verificationMaxFollowups" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "verificationReadAwareEscalation" BOOLEAN NOT NULL DEFAULT true;

-- Order-level verification tracking
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "followupCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "verificationOutcome" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationFinalizedAt" TIMESTAMP(3);
