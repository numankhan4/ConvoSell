# Test Data & Role Testing Setup Guide

## Overview

This system provides a complete testing environment with:
- **5 test users**, each with their own isolated workspace
- **Role-based permissions** to test different access levels
- **One-click test data generation** (owner-only feature)

## Test User Accounts

Each test user is created following the **same signup flow** as normal users, ensuring consistency.

| User | Email | Password | Role | Workspace |
|------|-------|----------|------|-----------|
| Owner | `owner@test.com` | `test123` | `owner` | Owner Test Workspace |
| Admin | `admin@test.com` | `test123` | `admin` | Admin Test Workspace |
| Manager | `manager@test.com` | `test123` | `manager` | Manager Test Workspace |
| Agent | `agent@test.com` | `test123` | `agent` | Agent Test Workspace |
| Viewer | `viewer@test.com` | `test123` | `viewer` | Viewer Test Workspace |

## How It Works

### Workspace Isolation
- ✅ Each test user has their **own separate workspace**
- ✅ Each user is the **designated role** in their workspace
- ✅ Workspaces are created using the **same transaction** as normal signup
- ✅ Each workspace has isolated data (contacts, orders, conversations, etc.)

### Permission System

#### Owner Role (`owner@test.com`)
- ✅ **Full access** to all features
- ✅ **Can generate/delete test data** (exclusive to owner)
- ✅ Can impersonate other users for testing
- ✅ Has `workspace:delete` permission

#### Admin Role (`admin@test.com`)
- ✅ Full control **except** billing and workspace deletion
- ❌ **Cannot generate/delete test data** (lacks `workspace:delete`)
- ❌ Cannot impersonate other users
- ✅ Can manage team, integrations, automations, templates

#### Manager Role (`manager@test.com`)
- ✅ Team and operations management
- ✅ Can view analytics and reports
- ❌ Cannot modify workspace settings
- ❌ Cannot generate test data

#### Agent Role (`agent@test.com`)
- ✅ Customer-facing operations
- ✅ Can send messages and view conversations
- ❌ Cannot create automations or templates
- ❌ Limited access to analytics

#### Viewer Role (`viewer@test.com`)
- ✅ Read-only access
- ❌ Cannot send messages or modify data
- ❌ Cannot access any management features

## Setup Instructions

### 1. Create Test Users

```bash
cd backend
node create-test-users.js
```

This will create 5 test users, each with their own workspace, following the exact same flow as normal user registration.

### 2. Generate Test Data for ALL Workspaces (Recommended)

**One-Command Setup:**
```bash
cd backend
node generate-all-test-data.js
```

This will automatically:
- Find all test user workspaces
- Generate dummy data for each workspace (5 contacts, 3 conversations, 15+ messages, 5 orders, 2 automations, 2 templates per workspace)
- Show total statistics

**What gets created PER workspace:**
- 5 test contacts (Pakistani customers with unique phone numbers)
- 3 conversations with messages
- 5 sample orders (various statuses)
- 2 automation rules
- 2 WhatsApp message templates

**Output Example:**
```
✅ ALL TEST DATA GENERATED!
📊 Total Statistics:
   Workspaces:    5
   Contacts:      25
   Conversations: 15
   Messages:      75
   Orders:        25
   Automations:   10
   Templates:     10
```

### 3. Generate Test Data via UI (Owner Only)

**Alternative method - Manual per workspace:**
1. Go to http://localhost:3004/login
2. Login with any test user (all have password: `test123`)
3. Navigate to **Settings → Test Data**
4. Click **"Generate Test Data"**

**Note:** Only users with owner role can access the Test Data page. Currently, test users have their designated roles (admin, manager, etc.), so UI generation only works for `owner@test.com`.

### 4. Clean Up All Test Data

**Delete everything:**
```bash
cd backend
node delete-all-test-data.js
```

This removes ALL data from ALL test user workspaces in one command.

### 3. Testing Different Roles

**Option A: User Impersonation (Recommended)**
1. Login as `owner@test.com`
2. Click the **User Switcher** dropdown (top right)
3. Select any test user to impersonate
4. Test permissions for that role
5. Click **"Return to [Your Name]"** to go back to owner

**Option B: Separate Login**
1. Logout from current account
2. Login as `admin@test.com`, `manager@test.com`, etc.
3. Each user sees their own workspace with their role permissions
4. Generate test data in each workspace separately

## Testing Workflow

### Quick Start (Recommended)

1. **Create Users & Generate Data:**
   ```bash
   cd backend
   node create-test-users.js
   node generate-all-test-data.js
   ```

2. **Login and Test:**
   - Login as any test user (`owner@test.com`, `admin@test.com`, etc.)
   - All workspaces now have test data
   - Test role-based permissions immediately

3. **Clean Up When Done:**
   ```bash
   node delete-all-test-data.js
   ```

### Full Test Cycle (Detailed)

1. **Create Users** → `node create-test-users.js`
2. **Generate All Data** → `node generate-all-test-data.js`
3. **Test as Owner** → Login as `owner@test.com`
   - Has owner role in "Owner Test Workspace"
   - Can access all owner features
   - Has test data already loaded
4. **Test as Admin** → Login as `admin@test.com`
   - Has admin role in "Admin Test Workspace"
   - Test admin permissions (no billing, no workspace deletion)
   - Has test data already loaded
5. **Test as Manager** → Login as `manager@test.com`
   - Has manager role in "Manager Test Workspace"
   - Test manager permissions
   - Has test data already loaded
6. **Test as Agent** → Login as `agent@test.com`
   - Has agent role in "Agent Test Workspace"
   - Test agent permissions (customer-facing only)
   - Has test data already loaded
7. **Test as Viewer** → Login as `viewer@test.com`
   - Has viewer role in "Viewer Test Workspace"
   - Test viewer permissions (read-only)
   - Has test data already loaded
8. **Clean Up** → `node delete-all-test-data.js`
9. **Regenerate** → `node generate-all-test-data.js` (for fresh testing)

### Using User Impersonation

**For quick role testing without re-login:**
1. Login as `owner@test.com`
2. Use User Switcher (top right) to impersonate other test users
3. Test permissions for that role
4. Click "Return to Owner" to go back

**Note:** When impersonating, you stay in the owner's workspace. For testing with separate workspace data, login directly as the test user.

## API Endpoints

### Backend Routes (Owner Only)

```typescript
POST   /api/test-data/generate  // Generate test data
DELETE /api/test-data            // Delete all data
GET    /api/test-data/stats      // Get data counts
```

**Security Headers:**
```typescript
Authorization: Bearer <token>
x-workspace-id: <workspace-id>
```

**Required Permission:**
- `workspace:delete` (owner role only)

## Troubleshooting

### "Access Denied" Error
**Problem:** Can't access Test Data page as admin/manager/etc.  
**Solution:** This is correct! Only owner role can access. Login as `owner@test.com`.

### "Cannot generate test data"
**Problem:** API returns 403 Forbidden  
**Solution:** Verify you're logged in as owner role. Check token includes correct workspace.

### Test users already exist
**Problem:** Script says "User already exists, skipping..."  
**Solution:** This is normal. Script won't duplicate users. To recreate, manually delete from database.

### No data in workspace
**Problem:** Logged in but see empty workspace  
**Solution:** Use Settings → Test Data → Generate to create dummy data.

## Notes

- 🔐 **Security:** Test data generation via UI restricted to workspace owners only
- 🏢 **Isolation:** Each test user has completely separate workspace data
- 🔄 **Signup Flow:** Test user creation follows exact same flow as normal registration
- 🧪 **Testing:** Use CLI scripts for bulk data generation, or UI for manual testing
- 🗑️ **Cleanup:** Delete and regenerate data anytime with CLI scripts
- ⚡ **Quick Setup:** One command populates ALL test workspaces: `node generate-all-test-data.js`

## CLI Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `create-test-users.js` | Create 5 test users with workspaces | First time setup |
| `generate-all-test-data.js` | Populate ALL workspaces with data | After creating users, or to reset |
| `delete-all-test-data.js` | Remove ALL data from ALL workspaces | Clean up before regenerating |
| `delete-test-users.js` | Delete test users entirely | Start completely fresh |

## Production Considerations

⚠️ **DO NOT** run test scripts in production!

- Test users are for **development/testing only**
- Test data should be **deleted before production deployment**
- User impersonation should be **disabled in production** (or restricted to admins)
- Consider using feature flags to disable testing features in production
