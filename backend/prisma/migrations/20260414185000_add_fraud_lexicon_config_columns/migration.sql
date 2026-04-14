-- Add DB-managed fraud lexicon configuration
ALTER TABLE "fraud_rule_configs"
ADD COLUMN IF NOT EXISTS "suspiciousKeywords" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "disposableDomains" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "fuzzyMatchDistance" INTEGER NOT NULL DEFAULT 1;
