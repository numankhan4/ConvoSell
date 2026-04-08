import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CreateTemplateDto, UpdateTemplateDto, SendTemplateDto } from './dto/template.dto';
import { decryptSecret } from '../common/utils/crypto.util';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly apiUrl: string;

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private httpService: HttpService,
    private config: ConfigService,
  ) {
    this.apiUrl = config.get('WHATSAPP_API_URL') || 'https://graph.facebook.com/v18.0';
  }

  private async writeReadAudit(
    workspaceId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          action,
          entityType,
          entityId,
          metadata,
        },
      });
    } catch {
      // Do not break analytics/reporting reads if auditing fails.
    }
  }

  /**
   * Get all templates for workspace
   */
  async findAll(workspaceId: string) {
    const templates = await this.prisma.whatsAppMessageTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    return templates;
  }

  /**
   * Get single template by ID
   */
  async findOne(workspaceId: string, id: string) {
    const template = await this.prisma.whatsAppMessageTemplate.findFirst({
      where: { id, workspaceId },
      include: {
        templateMessages: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            recipientPhone: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            readAt: true,
            estimatedCost: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Create new template and submit to Meta for approval
   */
  async create(workspaceId: string, dto: CreateTemplateDto) {
    // Get WhatsApp integration
    const integration = await this.prisma.whatsAppIntegration.findFirst({
      where: { workspaceId, isActive: true },
    });

    if (!integration) {
      throw new BadRequestException('WhatsApp not connected for this workspace');
    }

    // Validate template name (Meta requirements: lowercase, no spaces, underscores allowed)
    const templateName = dto.name.toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z0-9_]+$/.test(templateName)) {
      throw new BadRequestException('Template name must contain only lowercase letters, numbers, and underscores');
    }

    // Check if template already exists
    const existing = await this.prisma.whatsAppMessageTemplate.findFirst({
      where: {
        workspaceId,
        name: templateName,
        language: dto.language || 'en',
      },
    });

    if (existing) {
      throw new BadRequestException(`Template "${templateName}" already exists`);
    }

    // Build Meta API payload
    const components: any[] = [];

    // Header component
    if (dto.headerType && dto.headerText) {
      components.push({
        type: 'HEADER',
        format: dto.headerType,
        text: dto.headerText,
      });
    } else if (dto.headerType && dto.headerMediaUrl) {
      components.push({
        type: 'HEADER',
        format: dto.headerType,
        example: {
          header_handle: [dto.headerMediaUrl],
        },
      });
    }

    // Body component (required)
    const bodyComponent: any = {
      type: 'BODY',
      text: dto.bodyText,
    };

    // Add example values for variables if provided
    if (dto.variables && dto.variables.length > 0) {
      bodyComponent.example = {
        body_text: [dto.variables.map(v => v.example)],
      };
    }

    components.push(bodyComponent);

    // Footer component
    if (dto.footerText) {
      components.push({
        type: 'FOOTER',
        text: dto.footerText,
      });
    }

    // Buttons component
    if (dto.buttons && dto.buttons.length > 0) {
      const buttons = dto.buttons.map(btn => {
        if (btn.type === 'QUICK_REPLY') {
          return {
            type: 'QUICK_REPLY',
            text: btn.text,
          };
        } else if (btn.type === 'URL') {
          return {
            type: 'URL',
            text: btn.text,
            url: btn.url,
          };
        } else if (btn.type === 'PHONE_NUMBER') {
          return {
            type: 'PHONE_NUMBER',
            text: btn.text,
            phone_number: btn.phoneNumber,
          };
        }
        return null;
      }).filter(Boolean);

      if (buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons,
        });
      }
    }

    try {
      const accessToken = decryptSecret(integration.accessToken) as string;

      // Submit template to Meta for approval
      const url = `${this.apiUrl}/${integration.businessAccountId}/message_templates`;
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            name: templateName,
            language: dto.language || 'en',
            category: dto.category,
            components,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const metaTemplateId = response.data.id;
      const metaStatus = response.data.status; // PENDING, APPROVED, REJECTED

      // Save template to database
      const template = await this.prisma.whatsAppMessageTemplate.create({
        data: {
          workspaceId,
          name: templateName,
          category: dto.category,
          language: dto.language || 'en',
          headerType: dto.headerType,
          headerText: dto.headerText,
          headerMediaUrl: dto.headerMediaUrl,
          bodyText: dto.bodyText,
          footerText: dto.footerText,
          buttons: dto.buttons as any || [],
          variables: dto.variables as any || [],
          metaTemplateId,
          status: metaStatus || 'PENDING',
        },
      });

      this.logger.log(`Template created: ${templateName} (Meta ID: ${metaTemplateId}, Status: ${metaStatus})`);

      return template;
    } catch (error: any) {
      this.logger.error('Failed to create template:', error.response?.data || error.message);
      
      const metaError = error.response?.data?.error;
      const errorMessage = metaError?.message || error.message || 'Failed to create template';
      
      throw new BadRequestException(`Meta API Error: ${errorMessage}`);
    }
  }

  /**
   * Update template (Note: Most changes require re-submission to Meta)
   */
  async update(workspaceId: string, id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.whatsAppMessageTemplate.findFirst({
      where: { id, workspaceId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Update database record
    const updated = await this.prisma.whatsAppMessageTemplate.update({
      where: { id },
      data: {
        bodyText: dto.bodyText,
        footerText: dto.footerText,
        buttons: dto.buttons,
        // Note: Major changes require creating a new template version with Meta
      },
    });

    this.logger.log(`Template updated: ${template.name}`);

    return updated;
  }

  /**
   * Delete template
   */
  async delete(workspaceId: string, id: string) {
    const template = await this.prisma.whatsAppMessageTemplate.findFirst({
      where: { id, workspaceId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Delete from database (Meta template remains but won't be used)
    await this.prisma.whatsAppMessageTemplate.delete({
      where: { id },
    });

    this.logger.log(`Template deleted: ${template.name}`);

    return { success: true, message: 'Template deleted successfully' };
  }

  /**
   * Send template message with quota tracking
   */
  async sendTemplate(workspaceId: string, templateId: string, dto: SendTemplateDto) {
    return this.whatsappService.sendManagedTemplateMessage({
      workspaceId,
      templateId,
      recipientPhone: dto.recipientPhone,
      contactId: dto.contactId,
      orderId: dto.orderId,
      headerParams: dto.headerParams,
      bodyParams: dto.bodyParams,
      buttonParams: dto.buttonParams,
    });
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(workspaceId: string, templateId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const messages = await this.prisma.templateMessage.findMany({
      where: {
        workspaceId,
        templateId,
        createdAt: { gte: since },
      },
    });

    const totalSent = messages.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length;
    const totalDelivered = messages.filter(m => ['delivered', 'read'].includes(m.status)).length;
    const totalRead = messages.filter(m => m.status === 'read').length;
    const totalFailed = messages.filter(m => m.status === 'failed').length;
    const totalCost = messages.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);

    await this.writeReadAudit(workspaceId, 'templates.stats.view', 'template', templateId, {
      days,
      messageCount: messages.length,
      totalCost: Math.round(totalCost),
    });

    return {
      templateId,
      days,
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      totalCost: Math.round(totalCost),
      deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0,
      recentMessages: messages.slice(0, 10).map(m => ({
        id: m.id,
        recipientPhone: m.recipientPhone,
        status: m.status,
        sentAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        cost: m.estimatedCost,
      })),
    };
  }

  /**
   * Get quota status
   */
  async getQuotaStatus(workspaceId: string) {
    return this.whatsappService.getQuotaStatus(workspaceId);
  }

  /**
   * Get message history
   */
  async getMessageHistory(workspaceId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.templateMessage.findMany({
        where: { workspaceId },
        include: {
          template: {
            select: { id: true, name: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.templateMessage.count({
        where: { workspaceId },
      }),
    ]);

    await this.writeReadAudit(workspaceId, 'templates.messages.history.view', 'template_message', null, {
      page,
      limit,
      resultCount: messages.length,
      total,
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
