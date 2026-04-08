import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

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
      // Never block CRM reads on audit failures.
    }
  }

  /**
   * Normalize phone number to E.164 format (always start with +)
   */
  private normalizePhoneNumber(phone: string): string {
    if (!phone) return phone;
    // Remove all spaces, dashes, and parentheses
    let normalized = phone.replace(/[\s\-\(\)]/g, '');
    // Add + if not present
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    return normalized;
  }

  /**
   * Get all contacts for workspace
   */
  async getContacts(workspaceId: string, params: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { whatsappPhone: { contains: params.search } },
      ];
    }

    if (params.tags && params.tags.length > 0) {
      where.tags = { hasSome: params.tags };
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastContactAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    await this.writeReadAudit(workspaceId, 'contacts.list.view', 'contact', null, {
      page,
      limit,
      hasSearch: !!params.search,
      hasTags: !!params.tags?.length,
      resultCount: contacts.length,
      total,
    });

    return {
      data: contacts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single contact with conversations
   */
  async getContact(workspaceId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
      include: {
        conversations: {
          include: {
            messages: {
              take: 50,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await this.writeReadAudit(workspaceId, 'contact.detail.view', 'contact', contactId, {
      found: !!contact,
    });

    return contact;
  }

  /**
   * Create a new contact
   */
  async createContact(
    workspaceId: string, 
    data: {
      name: string;
      email?: string;
      whatsappPhone?: string;
      phone?: string;
    }
  ) {
    // Normalize WhatsApp phone number
    const normalizedWhatsAppPhone = data.whatsappPhone 
      ? this.normalizePhoneNumber(data.whatsappPhone) 
      : undefined;

    // Check if contact already exists with this WhatsApp phone
    if (normalizedWhatsAppPhone) {
      const existing = await this.prisma.contact.findFirst({
        where: {
          workspaceId,
          whatsappPhone: normalizedWhatsAppPhone,
        },
      });

      if (existing) {
        throw new Error('A contact with this WhatsApp number already exists');
      }
    }

    // Check if contact exists with this email
    if (data.email) {
      const existing = await this.prisma.contact.findFirst({
        where: {
          workspaceId,
          email: data.email,
        },
      });

      if (existing) {
        throw new Error('A contact with this email already exists');
      }
    }

    return this.prisma.contact.create({
      data: {
        workspaceId,
        name: data.name,
        email: data.email,
        whatsappPhone: normalizedWhatsAppPhone,
        customFields: data.phone ? { phone: data.phone } : {},
        lastContactAt: new Date(),
      },
    });
  }

  /**
   * Get conversations (inbox)
   */
  async getConversations(workspaceId: string, params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (params.status) {
      where.status = params.status;
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              whatsappPhone: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    await this.writeReadAudit(workspaceId, 'conversations.list.view', 'conversation', null, {
      page,
      limit,
      status: params.status || null,
      resultCount: conversations.length,
      total,
    });

    return {
      data: conversations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(workspaceId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    await this.writeReadAudit(workspaceId, 'conversation.detail.view', 'conversation', conversationId, {
      found: !!conversation,
      messageCount: conversation?.messages?.length || 0,
    });

    // Mark as read
    if (conversation) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      });
    }

    return conversation;
  }

  /**
   * Export contacts in JSON or CSV format.
   */
  async exportContacts(workspaceId: string, format: 'json' | 'csv' = 'json') {
    const contacts = await this.prisma.contact.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        whatsappPhone: true,
        tags: true,
        totalOrders: true,
        lastContactAt: true,
        createdAt: true,
      },
    });

    await this.writeReadAudit(workspaceId, 'contacts.export', 'contact', null, {
      format,
      count: contacts.length,
    });

    if (format === 'csv') {
      const escapeCsv = (value: unknown) => {
        if (value === null || value === undefined) return '';
        const raw = Array.isArray(value) ? value.join('|') : String(value);
        return `"${raw.replace(/"/g, '""')}"`;
      };

      const header = [
        'id',
        'name',
        'email',
        'whatsappPhone',
        'tags',
        'totalOrders',
        'lastContactAt',
        'createdAt',
      ];

      const rows = contacts.map((contact) => [
        escapeCsv(contact.id),
        escapeCsv(contact.name),
        escapeCsv(contact.email),
        escapeCsv(contact.whatsappPhone),
        escapeCsv(contact.tags),
        escapeCsv(contact.totalOrders),
        escapeCsv(contact.lastContactAt?.toISOString()),
        escapeCsv(contact.createdAt.toISOString()),
      ]);

      return {
        format,
        filename: `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`,
        generatedAt: new Date().toISOString(),
        count: contacts.length,
        data: [header.join(','), ...rows.map((row) => row.join(','))].join('\n'),
      };
    }

    return {
      format,
      filename: `contacts-export-${new Date().toISOString().slice(0, 10)}.json`,
      generatedAt: new Date().toISOString(),
      count: contacts.length,
      data: contacts,
    };
  }

  /**
   * Add tag to contact
   */
  async addTagToContact(workspaceId: string, contactId: string, tagId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, workspaceId },
    });

    if (!contact) return null;

    if (!contact.tags.includes(tagId)) {
      return this.prisma.contact.update({
        where: { id: contactId },
        data: {
          tags: { push: tagId },
        },
      });
    }

    return contact;
  }

  /**
   * Create or get tags
   */
  async getTags(workspaceId: string) {
    return this.prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(workspaceId: string, name: string, color?: string) {
    return this.prisma.tag.create({
      data: {
        workspaceId,
        name,
        color: color || '#3b82f6',
      },
    });
  }
}
