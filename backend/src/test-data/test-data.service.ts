import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TestDataService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate test data for workspace
   */
  async generateTestData(workspaceId: string) {
    // Sample data templates
    const CUSTOMER_NAMES = [
      { firstName: 'Ahmed', lastName: 'Khan', phone: '+923001234567' },
      { firstName: 'Fatima', lastName: 'Ali', phone: '+923009876543' },
      { firstName: 'Hassan', lastName: 'Malik', phone: '+923007654321' },
      { firstName: 'Ayesha', lastName: 'Rashid', phone: '+923005555555' },
      { firstName: 'Usman', lastName: 'Siddiqui', phone: '+923006666666' },
      { firstName: 'Zainab', lastName: 'Ahmed', phone: '+923007777777' },
      { firstName: 'Ali', lastName: 'Hassan', phone: '+923008888888' },
      { firstName: 'Maryam', lastName: 'Sheikh', phone: '+923009999999' },
      { firstName: 'Bilal', lastName: 'Aziz', phone: '+923001111111' },
      { firstName: 'Sara', lastName: 'Noor', phone: '+923002222222' },
    ];

    const MESSAGE_TEMPLATES = [
      'Hello! How can I help you today?',
      'I am interested in your products.',
      'What is the price for this item?',
      'Can we discuss bulk pricing?',
      'Please confirm my order.',
      'Is this item in stock?',
      'When will my order be delivered?',
      'Thank you for your assistance!',
    ];

    const PRODUCT_NAMES = [
      'Wireless Earbuds',
      'Smart Watch',
      'Phone Case',
      'Laptop Bag',
      'Power Bank',
      'USB Cable',
      'Screen Protector',
      'Bluetooth Speaker',
    ];

    const stats = {
      contacts: 0,
      conversations: 0,
      messages: 0,
      orders: 0,
      automations: 0,
      templates: 0,
    };

    try {
      // Create contacts
      const contacts: any[] = [];
      for (const customer of CUSTOMER_NAMES) {
        const existing = await this.prisma.contact.findFirst({
          where: {
            workspaceId,
            whatsappPhone: customer.phone,
          },
        });

        if (!existing) {
          const contact = await this.prisma.contact.create({
            data: {
              workspaceId,
              name: `${customer.firstName} ${customer.lastName}`,
              whatsappPhone: customer.phone,
              email: `${customer.firstName.toLowerCase()}.${customer.lastName.toLowerCase()}@example.com`,
              tags: ['test-customer', 'dummy-data'],
              customFields: {
                firstName: customer.firstName,
                lastName: customer.lastName,
              },
            },
          });
          contacts.push(contact);
          stats.contacts++;
        } else {
          contacts.push(existing);
        }
      }

      // Create conversations and messages
      for (let i = 0; i < Math.min(5, contacts.length); i++) {
        const contact = contacts[i];
        const conversation = await this.prisma.conversation.create({
          data: {
            workspaceId,
            contactId: contact.id,
            lastMessageAt: new Date(Date.now() - Math.random() * 86400000 * 7),
            status: ['open', 'closed'][Math.floor(Math.random() * 2)],
            unreadCount: Math.floor(Math.random() * 3),
          },
        });
        stats.conversations++;

        const msgCount = 3 + Math.floor(Math.random() * 3);
        for (let j = 0; j < msgCount; j++) {
          const msgTime = new Date(Date.now() - (msgCount - j) * 3600000);
          await this.prisma.message.create({
            data: {
              workspaceId,
              conversationId: conversation.id,
              direction: j % 2 === 0 ? 'inbound' : 'outbound',
              content:
                MESSAGE_TEMPLATES[
                  Math.floor(Math.random() * MESSAGE_TEMPLATES.length)
                ],
              status: 'delivered',
              whatsappMessageId: `wamid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              sentAt: msgTime,
              deliveredAt: new Date(msgTime.getTime() + 1000),
              createdAt: msgTime,
            },
          });
          stats.messages++;
        }
      }

      // Create orders
      const existingOrdersCount = await this.prisma.order.count({
        where: { workspaceId },
      });
      
      if (existingOrdersCount === 0) {
        const orderStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        for (let i = 0; i < Math.min(8, contacts.length); i++) {
          const contact = contacts[i];
          const status = orderStatuses[i % orderStatuses.length];
          const quantity = 1 + Math.floor(Math.random() * 5);
          const price = 500 + Math.floor(Math.random() * 4500);
          const total = quantity * price;
          const orderNum = String(1000 + i).padStart(5, '0');

          await this.prisma.order.create({
            data: {
              workspaceId,
              contactId: contact.id,
              externalOrderId: `SHOP_${orderNum}`,
              externalOrderNumber: `#${orderNum}`,
              status,
              totalAmount: total,
              currency: 'PKR',
              items: [
                {
                  name: PRODUCT_NAMES[
                    Math.floor(Math.random() * PRODUCT_NAMES.length)
                  ],
                  quantity,
                  price,
                  total,
                },
              ],
              confirmedAt:
                status === 'confirmed' || status === 'completed'
                  ? new Date()
                  : null,
              confirmationSentAt:
                status === 'confirmed' || status === 'completed'
                  ? new Date()
                  : null,
            },
          });
          stats.orders++;
        }
      }

      // Create automations
      const automations = [
        {
          name: 'Order Confirmation - Automated',
          description: 'Send confirmation when order created',
          trigger: { type: 'order_created', conditions: {} },
          isActive: true,
        },
        {
          name: 'Welcome Message',
          description: 'Welcome new customers',
          trigger: { type: 'contact_created', conditions: {} },
          isActive: true,
        },
        {
          name: 'Follow-up Reminder',
          description: 'Follow-up after 3 days',
          trigger: { type: 'order_pending', conditions: { days: 3 } },
          isActive: false,
        },
      ];

      for (const auto of automations) {
        const existing = await this.prisma.automation.findFirst({
          where: { workspaceId, name: auto.name },
        });

        if (!existing) {
          await this.prisma.automation.create({
            data: {
              workspaceId,
              name: auto.name,
              description: auto.description,
              trigger: auto.trigger,
              isActive: auto.isActive,
              actions: [
                {
                  type: 'send_message',
                  config: { message: 'Thank you for your order!' },
                },
              ],
            },
          });
          stats.automations++;
        }
      }

      // Create templates
      const templates = [
        {
          name: 'order_confirmation',
          category: 'UTILITY',
          bodyText:
            'Hi {{1}}! Order #{{2}} confirmed. Total: PKR {{3}}. Thank you for your order!',
          language: 'en',
          variables: [
            { name: 'customer_name', example: 'Ahmed' },
            { name: 'order_number', example: '1001' },
            { name: 'amount', example: '2500' },
          ],
        },
        {
          name: 'payment_request',
          category: 'UTILITY',
          bodyText: 'Dear {{1}}, please pay PKR {{2}} for order #{{3}}. Thanks!',
          language: 'en',
          variables: [
            { name: 'customer_name', example: 'Fatima' },
            { name: 'amount', example: '3000' },
            { name: 'order_number', example: '1002' },
          ],
        },
        {
          name: 'delivery_update',
          category: 'UTILITY',
          bodyText: 'Order #{{1}} is out for delivery. Arriving: {{2}}',
          language: 'en',
          variables: [
            { name: 'order_number', example: '1003' },
            { name: 'delivery_date', example: 'Tomorrow' },
          ],
        },
      ];

      for (const template of templates) {
        const existing = await this.prisma.whatsAppMessageTemplate.findFirst({
          where: { workspaceId, name: template.name },
        });

        if (!existing) {
          await this.prisma.whatsAppMessageTemplate.create({
            data: {
              workspaceId,
              name: template.name,
              category: template.category,
              bodyText: template.bodyText,
              language: template.language,
              variables: template.variables,
              status: 'APPROVED',
            },
          });
          stats.templates++;
        }
      }

      return {
        success: true,
        message: 'Test data generated successfully',
        stats,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete all test data from workspace
   */
  async deleteTestData(workspaceId: string) {
    try {
      // Delete in order to respect foreign key constraints
      await this.prisma.message.deleteMany({ where: { workspaceId } });
      await this.prisma.conversation.deleteMany({ where: { workspaceId } });
      await this.prisma.order.deleteMany({ where: { workspaceId } });
      await this.prisma.contact.deleteMany({ where: { workspaceId } });
      await this.prisma.automation.deleteMany({ where: { workspaceId } });
      await this.prisma.whatsAppMessageTemplate.deleteMany({
        where: { workspaceId },
      });

      return {
        success: true,
        message: 'All test data deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get data statistics for workspace
   */
  async getDataStats(workspaceId: string) {
    const [
      contacts,
      conversations,
      messages,
      orders,
      automations,
      templates,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { workspaceId } }),
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.message.count({ where: { workspaceId } }),
      this.prisma.order.count({ where: { workspaceId } }),
      this.prisma.automation.count({ where: { workspaceId } }),
      this.prisma.whatsAppMessageTemplate.count({ where: { workspaceId } }),
    ]);

    return {
      contacts,
      conversations,
      messages,
      orders,
      automations,
      templates,
    };
  }
}
