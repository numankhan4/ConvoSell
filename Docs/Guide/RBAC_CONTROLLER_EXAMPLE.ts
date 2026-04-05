/**
 * Example: Applying RBAC to CRM Contacts Controller
 * 
 * This shows how to update an existing controller with permission checks
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../common/decorators/permission.decorator';
import { Permission } from '../common/constants/permissions.constants';
import { WorkspaceId } from '../common/decorators/user.decorator';

@Controller('crm/contacts')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard) // Add PermissionGuard
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  /**
   * List all contacts - Requires view permission
   * 
   * Roles with access: All roles (viewer+)
   */
  @Get()
  @RequirePermission(Permission.CONTACTS_VIEW)
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: ContactQueryDto,
  ) {
    return this.contactsService.findAll(workspaceId, query);
  }

  /**
   * Get single contact - Requires view permission
   * 
   * Roles with access: All roles (viewer+)
   */
  @Get(':id')
  @RequirePermission(Permission.CONTACTS_VIEW)
  async findOne(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.findOne(workspaceId, id);
  }

  /**
   * Create contact - Requires create permission
   * 
   * Roles with access: agent, manager, admin, owner
   */
  @Post()
  @RequirePermission(Permission.CONTACTS_CREATE)
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() data: CreateContactDto,
  ) {
    return this.contactsService.create(workspaceId, data);
  }

  /**
   * Update contact - Requires update permission
   * 
   * Roles with access: agent, manager, admin, owner
   */
  @Put(':id')
  @RequirePermission(Permission.CONTACTS_UPDATE)
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() data: UpdateContactDto,
  ) {
    return this.contactsService.update(workspaceId, id, data);
  }

  /**
   * Delete contact - Requires delete permission
   * 
   * Roles with access: manager, admin, owner
   */
  @Delete(':id')
  @RequirePermission(Permission.CONTACTS_DELETE)
  async delete(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.delete(workspaceId, id);
  }

  /**
   * Export contacts - Requires export permission
   * 
   * Roles with access: manager, admin, owner
   */
  @Get('export/csv')
  @RequirePermission(Permission.CONTACTS_EXPORT)
  async exportContacts(
    @WorkspaceId() workspaceId: string,
    @Query() query: ContactExportDto,
  ) {
    return this.contactsService.exportToCsv(workspaceId, query);
  }

  /**
   * Bulk import - Requires both create and import permissions
   * 
   * Roles with access: manager, admin, owner
   */
  @Post('import')
  @RequireAnyPermission([
    Permission.CONTACTS_CREATE,
    Permission.CONTACTS_IMPORT,
  ])
  async importContacts(
    @WorkspaceId() workspaceId: string,
    @Body() data: ImportContactsDto,
  ) {
    return this.contactsService.importFromCsv(workspaceId, data);
  }
}

/**
 * BEFORE RBAC (OLD):
 * @Controller('crm/contacts')
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * export class ContactsController {
 *   // No permission checks - all authenticated users could access everything
 * }
 * 
 * AFTER RBAC (NEW):
 * - Added PermissionGuard to controller
 * - Added @RequirePermission decorator to each endpoint
 * - Granular control over who can do what
 * - Self-documenting (permissions in code)
 */

/**
 * PERMISSION ENFORCEMENT:
 * 
 * Viewer:     Can only GET (view)
 * Agent:      Can GET, POST, PUT (view, create, update)
 * Manager:    Can GET, POST, PUT, DELETE, export, import
 * Admin:      Same as Manager
 * Owner:      Same as Manager
 * SuperAdmin: Bypasses all checks
 */

/**
 * TESTING THE PERMISSIONS:
 * 
 * 1. Create a viewer user and try to POST /crm/contacts
 *    Expected: 403 Forbidden
 * 
 * 2. Create an agent user and try to DELETE /crm/contacts/:id
 *    Expected: 403 Forbidden
 * 
 * 3. Create a manager and try to export
 *    Expected: 200 OK
 * 
 * 4. Add custom permission to a viewer: CONTACTS_CREATE
 *    Expected: Viewer can now POST contacts (custom override)
 */
