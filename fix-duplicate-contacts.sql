-- Fix duplicate contacts by normalizing phone numbers
-- Run this script to merge duplicate contacts with/without + prefix

-- Step 1: Update all contacts to have + prefix if missing
UPDATE contacts 
SET "whatsappPhone" = '+' || "whatsappPhone"
WHERE "whatsappPhone" IS NOT NULL 
  AND "whatsappPhone" != ''
  AND "whatsappPhone" NOT LIKE '+%';

-- Step 2: Find and merge duplicate contacts
-- This will keep the first contact (oldest) and delete duplicates
WITH duplicates AS (
  SELECT 
    "whatsappPhone",
    "workspaceId",
    array_agg(id ORDER BY "createdAt" ASC) as ids
  FROM contacts
  WHERE "whatsappPhone" IS NOT NULL
  GROUP BY "whatsappPhone", "workspaceId"
  HAVING COUNT(*) > 1
)
SELECT 
  'Found ' || COUNT(*) || ' duplicate phone numbers' as message
FROM duplicates;

-- Step 3: Update conversations to point to the primary contact
WITH duplicates AS (
  SELECT 
    "whatsappPhone",
    "workspaceId",
    (array_agg(id ORDER BY "createdAt" ASC))[1] as keep_id,
    array_agg(id ORDER BY "createdAt" ASC)[2:] as delete_ids
  FROM contacts
  WHERE "whatsappPhone" IS NOT NULL
  GROUP BY "whatsappPhone", "workspaceId"
  HAVING COUNT(*) > 1
)
UPDATE conversations
SET "contactId" = d.keep_id
FROM duplicates d
WHERE "contactId" = ANY(d.delete_ids);

-- Step 4: Update orders to point to the primary contact
WITH duplicates AS (
  SELECT 
    "whatsappPhone",
    "workspaceId",
    (array_agg(id ORDER BY "createdAt" ASC))[1] as keep_id,
    array_agg(id ORDER BY "createdAt" ASC)[2:] as delete_ids
  FROM contacts
  WHERE "whatsappPhone" IS NOT NULL
  GROUP BY "whatsappPhone", "workspaceId"
  HAVING COUNT(*) > 1
)
UPDATE orders
SET "contactId" = d.keep_id
FROM duplicates d
WHERE "contactId" = ANY(d.delete_ids);

-- Step 5: Delete duplicate contacts
WITH duplicates AS (
  SELECT 
    "whatsappPhone",
    "workspaceId",
    array_agg(id ORDER BY "createdAt" ASC)[2:] as delete_ids
  FROM contacts
  WHERE "whatsappPhone" IS NOT NULL
  GROUP BY "whatsappPhone", "workspaceId"
  HAVING COUNT(*) > 1
)
DELETE FROM contacts
WHERE id IN (
  SELECT unnest(delete_ids) FROM duplicates
);

-- Verify: Count remaining contacts
SELECT 
  'Total contacts after cleanup: ' || COUNT(*) as result
FROM contacts;
