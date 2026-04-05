# RBAC System Implementation Guide

## Overview

The Role-Based Access Control (RBAC) system has been fully implemented with:
- **2-level system**: Platform (super admin) + Workspace (5 roles)
- **70+ granular permissions** across 11 feature categories
- **Custom permission overrides** for flexible access control
- **Subscription-aware** gates for feature access

## Backend Usage

### 1. Using Permission Decorators in Controllers

```typescript
import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission, RequireAnyPermission } from '../common/decorators/permission.decorator';
import { Permission } from '../common/constants/permissions.constants';

@Controller('contacts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ContactsController {
  
  // Single permission check
  @Get()
  @RequirePermission(Permission.CONTACTS_VIEW)
  getAllContacts() {
    // Only users with CONTACTS_VIEW permission can access
    return this.contactsService.findAll();
  }

  // Multiple permissions (requires ANY)
  @Post()
  @RequireAnyPermission([Permission.CONTACTS_CREATE, Permission.CONTACTS_MANAGE])
  createContact(@Body() data: CreateContactDto) {
    // Users with either CONTACTS_CREATE or CONTACTS_MANAGE can access
    return this.contactsService.create(data);
  }

  // Admin-only permission
  @Delete(':id')
  @RequirePermission(Permission.CONTACTS_DELETE)
  deleteContact(@Param('id') id: string) {
    // Only admins/owners with delete permission
    return this.contactsService.delete(id);
  }
}
```

### 2. Checking Permissions in Services

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PermissionService } from '../common/services/permission.service';
import { Permission } from '../common/constants/permissions.constants';

@Injectable()
export class OrdersService {
  constructor(private permissionService: PermissionService) {}

  async confirmOrder(userId: string, workspaceId: string, orderId: string) {
    // Check permission before action
    const hasPermission = await this.permissionService.hasPermission(
      userId,
      workspaceId,
      Permission.ORDERS_CONFIRM,
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to confirm orders');
    }

    // Proceed with order confirmation
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'confirmed' },
    });
  }
}
```

### 3. Managing Custom Permissions

```typescript
// Add custom permission to a user
await permissionService.addCustomPermission(
  userId,
  workspaceId,
  Permission.TEMPLATES_DELETE,
);

// Remove custom permission
await permissionService.removeCustomPermission(
  userId,
  workspaceId,
  Permission.TEMPLATES_DELETE,
);

// Get all user permissions (base role + custom)
const permissions = await permissionService.getUserPermissions(
  userId,
  workspaceId,
);
```

## Frontend Usage

### 1. Using the usePermissions Hook

```typescript
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';

function ContactsPage() {
  const { hasPermission, role, isOwner } = usePermissions();

  return (
    <div>
      {hasPermission(Permissions.CONTACTS_CREATE) && (
        <button onClick={createContact}>Create Contact</button>
      )}
      
      {isOwner && (
        <div>Owner-only content</div>
      )}
    </div>
  );
}
```

### 2. Using PermissionGate Component

```typescript
import { PermissionGate } from '@/components/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';

function SettingsPage() {
  return (
    <div>
      {/* Show delete button only if user has permission */}
      <PermissionGate permission={Permissions.CONTACTS_DELETE}>
        <button>Delete Contact</button>
      </PermissionGate>

      {/* Require ANY of multiple permissions */}
      <PermissionGate 
        permissions={[Permissions.WORKSPACE_UPDATE, Permissions.WORKSPACE_DELETE]}
      >
        <div>Advanced settings</div>
      </PermissionGate>

      {/* Require ALL permissions */}
      <PermissionGate 
        permissions={[Permissions.TEAM_INVITE, Permissions.TEAM_CHANGE_ROLES]}
        requireAll={true}
        fallback={<p>You need full team management access</p>}
      >
        <TeamManagement />
      </PermissionGate>
    </div>
  );
}
```

### 3. Using RoleGate Component

```typescript
import { RoleGate } from '@/components/PermissionGate';

function AdminPanel() {
  return (
    <RoleGate 
      roles={['owner', 'admin']} 
      fallback={<p>Admins only</p>}
    >
      <AdminDashboard />
    </RoleGate>
  );
}
```

## Workspace Roles

### Owner
- **Full workspace access** including billing and deletion
- Can manage all members and roles
- Cannot be removed by others

### Admin
- **Near-full access** except billing
- Can manage team members and assign roles
- Can configure integrations and settings

### Manager
- **Operational control** over day-to-day features
- Team management and workflow automation
- Cannot change workspace settings or billing

### Agent
- **Customer-facing permissions**
- View and respond to conversations
- Create/update contacts and orders

### Viewer
- **Read-only access** to most features
- Cannot make changes or send messages
- Good for reporting/analytics users

## Permission Categories

1. **Workspace**: View, update, delete, billing
2. **Team**: View, invite, remove, change roles
3. **Integrations**: View, connect, disconnect
4. **Contacts**: View, create, update, delete, export
5. **Conversations**: View all, send, assign
6. **Orders**: View, confirm, cancel, export
7. **Automations**: View, create, update, delete
8. **Templates**: View, create, update, delete, send
9. **Analytics**: View dashboard, export, view revenue
10. **Settings**: View, update
11. **Custom Permissions**: Overrides for specific users

## API Endpoints

### Get Current User's Workspace Member Info with Permissions
```
GET /workspace/members/me
Headers: Authorization: Bearer <token>
        X-Workspace-Id: <workspace-id>

Response:
{
  "id": "member-id",
  "workspaceId": "workspace-id",
  "userId": "user-id",
  "role": "admin",
  "customPermissions": ["templates:delete"],
  "permissions": [
    "workspace:view",
    "workspace:update",
    "team:view",
    // ... all permissions for this role + custom
  ]
}
```

## Database Schema

### User Model Additions
- `platformRole`: Platform-level role (for super admins)
- `isSuperAdmin`: Boolean flag for platform access
- `avatar`, `phone`, `timezone`, `language`: Profile fields
- `emailVerified`, `lastLoginAt`: Security tracking

### WorkspaceMember Model Additions
- `customPermissions`: JSON array of additional permissions
- `invitedBy`, `invitedAt`, `joinedAt`: Invitation tracking

### TeamInvitation Model (NEW)
- Email-based invitation system
- Token, expiration, and status tracking
- Supports role assignment on invite

## Next Steps

1. **Update existing controllers** to use `@RequirePermission` decorators
2. **Create team management UI** for inviting and managing members
3. **Add permission checks** to critical operations
4. **Test permission enforcement** across all features
5. **Add audit logging** for permission changes

## Testing the System

1. Create users with different roles
2. Test permission boundaries (agents shouldn't access admin features)
3. Verify custom permissions override base role permissions
4. Test subscription limits (member count, feature gates)
5. Ensure super admins bypass all checks

## Security Notes

- Super admins bypass ALL permission checks
- Permission checks happen server-side (frontend gates are UI-only)
- Custom permissions are additive (grant access, don't remove)
- Role hierarchy prevents privilege escalation
- All permission changes should be logged for auditing
