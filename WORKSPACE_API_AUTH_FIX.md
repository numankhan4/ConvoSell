# Fix: Workspace API Authentication Issues

## Errors
```
Failed to update workspace name
Failed to load workspace information (multiple times)
```

## Root Causes

### 1. Missing Authentication in API Client
**File**: `frontend/lib/api/workspace.ts`

The workspace API was using `axios` directly instead of the configured `api` instance that includes the authentication interceptor. This meant:
- ❌ No `Authorization: Bearer {token}` header
- ❌ No `x-workspace-id` header
- ❌ All requests were unauthenticated

### 2. Missing JwtAuthGuard in Backend
**File**: `backend/src/tenant/tenant.controller.ts`

The TenantController only had `@UseGuards(TenantGuard)`, but TenantGuard expects `request.user` to be set by `JwtAuthGuard` first. Without JwtAuthGuard:
- ❌ No user authentication
- ❌ TenantGuard couldn't verify workspace membership
- ❌ Requests failed with 401/403 errors

## Solutions Implemented

### Fix 1: Use Configured API Instance
**File**: `frontend/lib/api/workspace.ts`

**Before**:
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const workspaceApi = {
  getWorkspace: async () => {
    const response = await axios.get(`${API_URL}/workspace`);
    return response.data;
  },
  // ...
}
```

**After**:
```typescript
import api from '../api';

export const workspaceApi = {
  getWorkspace: async () => {
    const response = await api.get('/workspace');
    return response.data;
  },
  // ...
}
```

**What Changed**:
- ✅ Now uses `api` instance from `lib/api.ts`
- ✅ Automatically includes auth token via interceptor
- ✅ Automatically includes workspace ID via interceptor
- ✅ Benefits from 15s timeout and error handling

### Fix 2: Add JwtAuthGuard to Controller
**File**: `backend/src/tenant/tenant.controller.ts`

**Before**:
```typescript
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('workspace')
@UseGuards(TenantGuard)
export class TenantController {
```

**After**:
```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('workspace')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantController {
```

**What Changed**:
- ✅ Added `JwtAuthGuard` before `TenantGuard`
- ✅ JWT validates token and sets `request.user`
- ✅ TenantGuard then verifies workspace membership
- ✅ Proper authentication flow: JWT → Tenant → Role checks

### Fix 3: Better Error Messages
**File**: `frontend/app/dashboard/settings/workspace/page.tsx`

**Before**:
```typescript
} catch (error) {
  toast.error('Failed to load workspace information');
}
```

**After**:
```typescript
} catch (error: any) {
  const errorMessage = error.response?.data?.message || error.message || 'Failed to load workspace information';
  toast.error(errorMessage);
}
```

**What Changed**:
- ✅ Shows actual error message from API
- ✅ Falls back to error.message if no API message
- ✅ Falls back to generic message if all else fails
- ✅ Better debugging experience

## How Authentication Works Now

### Request Flow

1. **User makes request** (e.g., load workspace info)
   ```typescript
   const data = await workspaceApi.getWorkspace();
   ```

2. **API Interceptor adds headers** (in `lib/api.ts`)
   ```typescript
   // From localStorage auth-storage:
   headers['Authorization'] = 'Bearer {token}'
   headers['x-workspace-id'] = '{currentWorkspace.id}'
   ```

3. **Backend receives request**
   ```
   GET /api/workspace
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   x-workspace-id: cmndiib400002phbc5ymhv5fp
   ```

4. **JwtAuthGuard validates token**
   - Decodes JWT
   - Validates signature
   - Sets `request.user = { sub: userId, email, ... }`

5. **TenantGuard verifies workspace access**
   - Gets workspace ID from headers
   - Checks if `user.sub` has membership in workspace
   - Verifies workspace is active
   - Sets `request.workspaceId` and `request.workspaceRole`

6. **Controller executes**
   ```typescript
   @Get()
   getWorkspace(@WorkspaceId() workspaceId: string) {
     return this.tenantService.getWorkspace(workspaceId);
   }
   ```

7. **Response sent back**
   ```json
   {
     "id": "cmndiib400002phbc5ymhv5fp",
     "name": "Qeemti Saman",
     "slug": "qeemti-saman",
     "plan": "free",
     "createdAt": "2026-03-30T...",
     "updatedAt": "2026-04-05T..."
   }
   ```

## Testing

### Test 1: Load Workspace Info
1. Go to Settings → Workspace Settings
2. ✅ Page loads without errors
3. ✅ Shows actual workspace name from database
4. ✅ Shows workspace slug
5. ✅ Shows creation date
6. ✅ No "Failed to load workspace information" errors

### Test 2: Update Workspace Name
1. Click "Edit" on workspace name
2. Change name to "My Test Store"
3. Click "Save"
4. ✅ Success message: "Workspace name updated successfully"
5. ✅ Field shows new name (not old name)
6. ✅ Sidebar updates to show "My Test Store"
7. ✅ Refresh page - new name persists

### Test 3: Authentication Validation
Open browser DevTools → Network tab:

**GET /api/workspace**
- ✅ Request headers include `Authorization: Bearer {token}`
- ✅ Request headers include `x-workspace-id: {id}`
- ✅ Status: 200 OK
- ✅ Response includes workspace data

**PATCH /api/workspace**
- ✅ Request headers include `Authorization: Bearer {token}`
- ✅ Request headers include `x-workspace-id: {id}`
- ✅ Request body: `{"name": "My Test Store"}`
- ✅ Status: 200 OK
- ✅ Response includes updated workspace

### Test 4: Error Handling
Test with invalid token (modify localStorage):
1. Open DevTools → Application → Local Storage
2. Modify `auth-storage` token to invalid value
3. Try to load workspace settings
4. ✅ Shows specific error: "Unauthorized" or "Invalid token"
5. ✅ Not generic "Failed to load workspace information"

## Files Modified

1. **frontend/lib/api/workspace.ts**
   - Changed from `axios` to `api` instance
   - Now includes authentication automatically

2. **backend/src/tenant/tenant.controller.ts**
   - Added `JwtAuthGuard` import
   - Added `JwtAuthGuard` to `@UseGuards` decorator
   - Proper guard order: JWT → Tenant → Role

3. **frontend/app/dashboard/settings/workspace/page.tsx**
   - Improved error messages
   - Shows actual API error messages
   - Better user feedback

## Guard Order Matters!

The order of guards in `@UseGuards()` is important:

```typescript
@UseGuards(JwtAuthGuard, TenantGuard)  // ✅ Correct
@UseGuards(TenantGuard, JwtAuthGuard)  // ❌ Wrong - TenantGuard needs request.user
```

**Why**:
1. JwtAuthGuard must run first to set `request.user`
2. TenantGuard reads `request.user.sub` to verify membership
3. If TenantGuard runs first, `request.user` is undefined → error

## Other Controllers Using Same Pattern

These controllers already had the correct pattern:
- `health-check.controller.ts`: `@UseGuards(JwtAuthGuard, TenantGuard)`
- `settings.controller.ts`: Uses global guards
- `crm.controller.ts`: Uses global guards

## Interceptor Reference

The API interceptor in `lib/api.ts`:
```typescript
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    
    // Add Authorization token
    if (state?.token) {
      config.headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    // Add workspace ID
    if (state?.currentWorkspace) {
      config.headers['x-workspace-id'] = state.currentWorkspace.id;
    }
  }
  return config;
});
```

## Common Issues & Solutions

**Problem**: Still getting "Failed to load workspace information"
**Solution**: Clear localStorage and log in again to get fresh token

**Problem**: Getting "Access denied to this workspace"
**Solution**: User doesn't have membership in workspace. Check WorkspaceMember table.

**Problem**: Getting "Workspace ID is required"
**Solution**: Frontend didn't send x-workspace-id header. Check if currentWorkspace exists in store.

**Problem**: Getting 401 Unauthorized
**Solution**: Token expired or invalid. Log out and log in again.

---

**Status**: ✅ **FIXED**

All workspace API endpoints now work correctly with proper authentication and tenant isolation.
