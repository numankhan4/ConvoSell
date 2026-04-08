import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service';
import { WorkspaceId } from '../common/decorators/user.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { RequirePermission } from '../common/decorators/permission.decorator';
import { Permission } from '../common/constants/permissions.constants';

@Controller('crm')
@UseGuards(TenantGuard)
export class CrmController {
  constructor(
    private crmService: CrmService,
    private prisma: PrismaService,
  ) {}

  @Get('contacts')
  getContacts(
    @WorkspaceId() workspaceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.crmService.getContacts(workspaceId, { page, limit, search });
  }

  @Get('contacts/export')
  @RequirePermission(Permission.CONTACTS_EXPORT)
  exportContacts(
    @WorkspaceId() workspaceId: string,
    @Query('format') format?: 'json' | 'csv',
  ) {
    return this.crmService.exportContacts(workspaceId, format || 'json');
  }

  @Get('contacts/:id')
  getContact(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.crmService.getContact(workspaceId, id);
  }

  @Post('contacts')
  createContact(
    @WorkspaceId() workspaceId: string,
    @Body() data: {
      name: string;
      email?: string;
      whatsappPhone?: string;
      phone?: string;
    }
  ) {
    return this.crmService.createContact(workspaceId, data);
  }

  @Get('conversations')
  getConversations(
    @WorkspaceId() workspaceId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
  ) {
    return this.crmService.getConversations(workspaceId, { status, page });
  }

  @Get('conversations/:id')
  getConversation(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.crmService.getConversationMessages(workspaceId, id);
  }

  @Get('debug/messages')
  async debugAllMessages(@WorkspaceId() workspaceId: string) {
    // Debug endpoint to check all messages
    const messages = await this.prisma.message.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        conversationId: true,
        direction: true,
        type: true,
        content: true,
        status: true,
        createdAt: true,
        whatsappMessageId: true,
      }
    });
    return { 
      count: messages.length, 
      messages,
      workspaceId
    };
  }

  @Get('tags')
  getTags(@WorkspaceId() workspaceId: string) {
    return this.crmService.getTags(workspaceId);
  }

  @Post('tags')
  createTag(@WorkspaceId() workspaceId: string, @Body() data: { name: string; color?: string }) {
    return this.crmService.createTag(workspaceId, data.name, data.color);
  }

  @Post('contacts/:id/tags')
  addTag(
    @WorkspaceId() workspaceId: string,
    @Param('id') contactId: string,
    @Body() data: { tagId: string },
  ) {
    return this.crmService.addTagToContact(workspaceId, contactId, data.tagId);
  }
}
