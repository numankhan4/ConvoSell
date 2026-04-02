-- Fix missing workspace memberships
-- This script creates WorkspaceMember records for all workspaces where the owner doesn't have membership

-- Insert workspace memberships for workspace owners
INSERT INTO workspace_members (id, "workspaceId", "userId", role, "isActive", "createdAt", "updatedAt")
SELECT 
  'wm_' || substr(md5(random()::text), 1, 20) as id,
  w.id as "workspaceId",
  w."ownerId" as "userId",
  'owner' as role,
  true as "isActive",
  NOW() as "createdAt",
  NOW() as "updatedAt"
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 
  FROM workspace_members wm 
  WHERE wm."workspaceId" = w.id 
  AND wm."userId" = w."ownerId"
);

-- Show the created records
SELECT 
  wm.id,
  w.name as workspace_name,
  u.email as user_email,
  wm.role,
  wm."isActive"
FROM workspace_members wm
JOIN workspaces w ON w.id = wm."workspaceId"
JOIN users u ON u.id = wm."userId"
ORDER BY wm."createdAt" DESC;
