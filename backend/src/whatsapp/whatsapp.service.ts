import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
import { SubscriptionPlan, canSendTemplateMessage, WHATSAPP_COSTS } from '../common/constants/subscription.constants';

interface SendMessageDto {
  to: string; // E.164 phone number
  type: 'text' | 'template' | 'interactive';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  interactive?: any;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly phoneNumberId: string;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private config: ConfigService,
    private shopifyService: ShopifyService,
  ) {
    this.apiUrl = config.get('WHATSAPP_API_URL') || 'https://graph.facebook.com/v18.0';
    this.apiToken = config.get('WHATSAPP_API_TOKEN') || '';
    this.phoneNumberId = config.get('WHATSAPP_PHONE_NUMBER_ID') || '';
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
   * Send a WhatsApp message via Meta Cloud API
   */
  async sendMessage(
    workspaceId: string,
    dto: SendMessageDto,
  ): Promise<{ messageId: string; status: string }> {
    try {
      // Get workspace WhatsApp integration
      const integration = await this.prisma.whatsAppIntegration.findFirst({
        where: {
          workspaceId,
          isActive: true,
        },
      });

      if (!integration) {
        throw new BadRequestException('WhatsApp not connected for this workspace');
      }

      // WhatsApp API expects phone without + sign, but we normalize with + for database
      const phoneForApi = dto.to.replace(/^\+/, '');

      // Call Meta Cloud API
      const url = `${this.apiUrl}/${integration.phoneNumberId}/messages`;
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            messaging_product: 'whatsapp',
            to: phoneForApi,
            type: dto.type,
            ...(dto.text && { text: dto.text }),
            ...(dto.template && { template: dto.template }),
            ...(dto.interactive && { interactive: dto.interactive }),
          },
          {
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const messageId = (response.data as any).messages[0].id;

      this.logger.log(`Message sent: ${messageId} to ${dto.to}`);

      // Save outbound message to database
      await this.saveOutboundMessage(workspaceId, dto.to, dto, messageId);

      return {
        messageId,
        status: 'sent',
      };
    } catch (error: any) {
      this.logger.error('Failed to send WhatsApp message', error.response?.data || error);
      
      // Extract error details from Meta API response
      const metaError = error.response?.data?.error;
      let errorMessage = metaError?.message || 'Failed to send message';
      
      // Provide helpful context for common errors
      if (errorMessage.includes('recipient phone number not allowed') || 
          errorMessage.includes('Recipient phone number not in allowed list') ||
          errorMessage.includes('Recipient phone number not allowed') ||
          metaError?.code === 131026 || 
          metaError?.code === 131030) {
        errorMessage = `📱 WhatsApp Development Mode Restriction\n\n` +
          `❌ Cannot send to: ${dto.to}\n` +
          `This number is not verified in your Meta App.\n\n` +
          `✅ TO FIX - Add this number to allowed list:\n\n` +
          `1. Open: https://developers.facebook.com/apps\n` +
          `2. Select your WhatsApp app\n` +
          `3. Go to: WhatsApp → API Setup\n` +
          `4. Under "Send and receive messages" → click "To" field\n` +
          `5. Click "Manage phone number list"\n` +
          `6. Add ${dto.to} and verify with OTP sent to that number\n` +
          `7. Retry sending the message\n\n` +
          `💡 TIP: Once verified, this number stays on the list permanently.\n` +
          `📌 For production use (unlimited numbers), submit your app for Meta review.`;
      } else if (errorMessage.includes('access token') || metaError?.code === 190) {
        errorMessage = 'Invalid WhatsApp access token. Please update in Settings.';
      } else if (errorMessage.includes('Phone number not found') || metaError?.code === 33) {
        errorMessage = 'WhatsApp Phone Number ID is invalid. Please check Settings.';
      }
      
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Send text message (simplified wrapper)
   */
  async sendTextMessage(
    workspaceId: string,
    to: string,
    message: string,
  ): Promise<{ messageId: string }> {
    const result = await this.sendMessage(workspaceId, {
      to,
      type: 'text',
      text: { body: message },
    });

    return { messageId: result.messageId };
  }

  /**
   * Send template message (for outbound after 24h window)
   */
  async sendTemplateMessage(
    workspaceId: string,
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[],
  ) {
    return this.sendMessage(workspaceId, {
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }

  /**
   * Send managed template message with quota tracking and cost management
   * This is the production-ready method for template messages
   */
  async sendManagedTemplateMessage(params: {
    workspaceId: string;
    templateId: string;
    recipientPhone: string;
    contactId?: string;
    orderId?: string;
    headerParams?: string[];
    bodyParams: string[];
    buttonParams?: string[];
  }): Promise<{ messageId: string; status: string; cost: number }> {
    const { workspaceId, templateId, recipientPhone, contactId, orderId, headerParams, bodyParams, buttonParams } = params;

    // 1. Get workspace and check subscription
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        plan: true,
        templateMessagesLimit: true,
        templateMessagesUsed: true,
        quotaResetAt: true,
        subscriptionStatus: true,
      },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found');
    }

    // Check if subscription is active
    if (workspace.subscriptionStatus !== 'active' && workspace.subscriptionStatus !== 'trialing') {
      throw new ForbiddenException('Your subscription is not active. Please update payment details.');
    }

    // Check quota reset (monthly cycle)
    const now = new Date();
    if (workspace.quotaResetAt < now) {
      // Reset quota
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          templateMessagesUsed: 0,
          quotaResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1), // First day of next month
        },
      });
      workspace.templateMessagesUsed = 0;
    }

    // 2. Check quota availability
    const quotaCheck = canSendTemplateMessage(
      workspace.plan as SubscriptionPlan,
      workspace.templateMessagesUsed,
      workspace.templateMessagesLimit
    );

    if (!quotaCheck.allowed) {
      throw new ForbiddenException(quotaCheck.reason);
    }

    // 3. Get template details
    const template = await this.prisma.whatsAppMessageTemplate.findUnique({
      where: { id: templateId },
      include: { workspace: true },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    if (template.workspaceId !== workspaceId) {
      throw new ForbiddenException('Template does not belong to this workspace');
    }

    if (template.status !== 'APPROVED') {
      throw new BadRequestException(`Template is not approved. Current status: ${template.status}`);
    }

    // 4. Build WhatsApp template components
    const components: any[] = [];

    // Header component
    if (template.headerType === 'TEXT' && template.headerText && headerParams?.length) {
      components.push({
        type: 'header',
        parameters: headerParams.map(value => ({ type: 'text', text: value })),
      });
    } else if (template.headerType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.headerType) && headerParams?.length) {
      components.push({
        type: 'header',
        parameters: [{ type: template.headerType.toLowerCase(), [template.headerType.toLowerCase()]: { link: headerParams[0] } }],
      });
    }

    // Body component (required if has variables)
    if (bodyParams?.length) {
      components.push({
        type: 'body',
        parameters: bodyParams.map(value => ({ type: 'text', text: value })),
      });
    }

    // Button component (for dynamic buttons)
    if (buttonParams?.length) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: buttonParams.map(value => ({ type: 'text', text: value })),
      });
    }

    // 5. Calculate estimated cost
    const estimatedCost = template.category === 'MARKETING' 
      ? WHATSAPP_COSTS.MARKETING_TEMPLATE 
      : WHATSAPP_COSTS.UTILITY_TEMPLATE;

    try {
      // 6. Send the template message via WhatsApp API
      const result = await this.sendMessage(workspaceId, {
        to: recipientPhone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components: components.length > 0 ? components : undefined,
        },
      });

      // 7. Record template message in database
      await this.prisma.templateMessage.create({
        data: {
          workspaceId,
          templateId,
          recipientPhone,
          contactId,
          orderId,
          headerParams: headerParams || [],
          bodyParams: bodyParams || [],
          buttonParams: buttonParams || [],
          whatsappMessageId: result.messageId,
          status: 'sent',
          estimatedCost,
          sentAt: new Date(),
        },
      });

      // 8. Increment workspace quota usage
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          templateMessagesUsed: { increment: 1 },
        },
      });

      // 9. Update template stats
      await this.prisma.whatsAppMessageTemplate.update({
        where: { id: templateId },
        data: {
          sentCount: { increment: 1 },
        },
      });

      this.logger.log(
        `✅ Template message sent: ${template.name} to ${recipientPhone} (Cost: PKR ${estimatedCost})`
      );

      return {
        messageId: result.messageId,
        status: 'sent',
        cost: estimatedCost,
      };
    } catch (error) {
      // Log failed attempt
      await this.prisma.templateMessage.create({
        data: {
          workspaceId,
          templateId,
          recipientPhone,
          contactId,
          orderId,
          headerParams: headerParams || [],
          bodyParams: bodyParams || [],
          buttonParams: buttonParams || [],
          status: 'failed',
          errorMessage: error.message,
          failedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Send interactive button message
   */
  async sendButtonMessage(
    workspaceId: string,
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[],
  ) {
    return this.sendMessage(workspaceId, {
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    });
  }

  /**
   * Save outbound message to database
   */
  private async saveOutboundMessage(
    workspaceId: string,
    recipientPhone: string,
    dto: SendMessageDto,
    whatsappMessageId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Saving outbound message to ${recipientPhone}...`);
      
      if (!workspaceId) {
        throw new Error('WorkspaceId is required but was undefined/null');
      }
      
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(recipientPhone);
      
      // Find or create contact
      let contact = await this.prisma.contact.findUnique({
        where: {
          workspaceId_whatsappPhone: {
            workspaceId,
            whatsappPhone: normalizedPhone,
          },
        },
      });

      if (!contact) {
        this.logger.log(`Creating new contact: ${normalizedPhone}`);
        contact = await this.prisma.contact.create({
          data: {
            workspaceId,
            whatsappPhone: normalizedPhone,
            name: normalizedPhone,
          },
        });
      } else {
        this.logger.log(`Found existing contact: ${contact.id}`);
      }

      // Find or create conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          workspaceId,
          contactId: contact.id,
          status: 'open',
        },
      });

      if (!conversation) {
        this.logger.log(`Creating new conversation for contact: ${contact.id}`);
        conversation = await this.prisma.conversation.create({
          data: {
            workspaceId,
            contactId: contact.id,
            status: 'open',
          },
        });
      } else {
        this.logger.log(`Found existing conversation: ${conversation.id}`);
      }

      // Extract message content
      let messageContent = '';
      if (dto.text) {
        messageContent = dto.text.body;
      } else if (dto.template) {
        messageContent = `[Template: ${dto.template.name}]`;
      } else if (dto.interactive) {
        messageContent = dto.interactive.body?.text || '[Interactive Message]';
      }

      this.logger.log(`Saving message: "${messageContent.substring(0, 50)}..."`);

      // Save message
      const savedMessage = await this.prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          direction: 'outbound',
          type: dto.type,
          content: messageContent,
          whatsappMessageId,
          status: 'sent',
          sentAt: new Date(),
          metadata: dto as any, // Cast to any for Prisma Json field
        },
      });

      this.logger.log(`✅ Message saved with ID: ${savedMessage.id}`);

      // Update conversation
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: messageContent.substring(0, 100),
        },
      });

      // Update contact
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          lastContactAt: new Date(),
        },
      });

      this.logger.log(`✅ Outbound message fully saved: ${whatsappMessageId}`);
    } catch (error) {
      this.logger.error('❌ Failed to save outbound message:', error);
      this.logger.error('Error details:', JSON.stringify(error, null, 2));
      // Don't throw - message was already sent to WhatsApp successfully
    }
  }

  /**
   * Verify webhook signature from Meta
   */
  verifyWebhookSignature(signature: string, payload: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.get('WHATSAPP_WEBHOOK_SECRET') || this.apiToken)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Handle incoming webhook event from Meta
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      const entry = event.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        this.logger.warn('Invalid webhook payload structure');
        return;
      }

      // Handle different event types
      if (value.messages) {
        await this.handleIncomingMessages(value);
      }

      if (value.statuses) {
        await this.handleMessageStatuses(value);
      }
    } catch (error) {
      this.logger.error('Error handling webhook event', error);
      throw error;
    }
  }

  /**
   * Handle incoming messages from customers
   */
  private async handleIncomingMessages(value: any): Promise<void> {
    const messages = value.messages;
    const contacts = value.contacts;
    const metadata = value.metadata;

    for (const message of messages) {
      const contact = contacts?.find((c) => c.wa_id === message.from);

      this.logger.log(`Received message from ${message.from}: ${message.type}`);

      // Find workspace by phone number ID
      const integration = await this.prisma.whatsAppIntegration.findUnique({
        where: { phoneNumberId: metadata.phone_number_id },
      });

      if (!integration) {
        this.logger.warn(`No integration found for phone: ${metadata.phone_number_id}`);
        continue;
      }

      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(message.from);

      // Find or create contact
      let dbContact = await this.prisma.contact.findUnique({
        where: {
          workspaceId_whatsappPhone: {
            workspaceId: integration.workspaceId,
            whatsappPhone: normalizedPhone,
          },
        },
      });

      if (!dbContact) {
        dbContact = await this.prisma.contact.create({
          data: {
            workspaceId: integration.workspaceId,
            whatsappPhone: normalizedPhone,
            name: contact?.profile?.name || normalizedPhone,
          },
        });
      }

      // Find or create conversation
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          workspaceId: integration.workspaceId,
          contactId: dbContact.id,
          status: 'open',
        },
      });

      if (!conversation) {
        conversation = await this.prisma.conversation.create({
          data: {
            workspaceId: integration.workspaceId,
            contactId: dbContact.id,
            status: 'open',
          },
        });
      }

      // Store message (check for duplicates first)
      const messageContent = this.extractMessageContent(message);
      
      // Check if message already exists (Meta sometimes sends duplicate webhooks)
      const existingMessage = await this.prisma.message.findUnique({
        where: { whatsappMessageId: message.id },
      });

      if (!existingMessage) {
        await this.prisma.message.create({
          data: {
            workspaceId: integration.workspaceId,
            conversationId: conversation.id,
            direction: 'inbound',
            type: message.type,
            content: messageContent,
            whatsappMessageId: message.id,
            status: 'delivered',
            metadata: message,
            createdAt: new Date(parseInt(message.timestamp) * 1000),
          },
        });

        // Update conversation only for new messages
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: messageContent?.substring(0, 100),
            unreadCount: { increment: 1 },
          },
        });

        this.logger.log(`Message stored: ${message.id}`);
        
        // Process button responses for order confirmation/cancellation
        if (message.type === 'interactive' && message.interactive?.button_reply) {
          await this.handleButtonResponse(
            integration.workspaceId,
            message.interactive.button_reply,
            dbContact.id,
          );
        }
      } else {
        this.logger.log(`Duplicate message ignored: ${message.id}`);
      }

      // Update contact
      await this.prisma.contact.update({
        where: { id: dbContact.id },
        data: {
          lastContactAt: new Date(),
        },
      });
    }
  }

  /**
   * Handle button response for order confirmation/cancellation
   */
  private async handleButtonResponse(
    workspaceId: string,
    buttonReply: any,
    contactId: string,
  ): Promise<void> {
    try {
      const buttonId = buttonReply.id;
      this.logger.log(`Processing button response: ${buttonId}`);

      // Check if it's an order confirmation button (format: confirm_<orderId>)
      if (buttonId.startsWith('confirm_')) {
        this.logger.log(`→ Routing to confirmOrder`);
        const orderId = buttonId.replace('confirm_', '');
        await this.confirmOrder(workspaceId, orderId, contactId);
      }
      // Check if it's an order cancellation button (format: cancel_<orderId>)
      else if (buttonId.startsWith('cancel_')) {
        this.logger.log(`→ Routing to cancelOrder`);
        const orderId = buttonId.replace('cancel_', '');
        await this.cancelOrder(workspaceId, orderId, contactId);
      }
      // Check if it's a feedback button (format: feedback_<reason>_<orderId>)
      else if (buttonId.startsWith('feedback_')) {
        this.logger.log(`→ Routing to handleFeedbackResponse`);
        await this.handleFeedbackResponse(buttonId, contactId);
      }
      else {
        this.logger.warn(`Unknown button ID format: ${buttonId}`);
      }
    } catch (error) {
      this.logger.error(`Error handling button response:`, error);
    }
  }

  /**
   * Confirm an order
   */
  private async confirmOrder(
    workspaceId: string,
    orderId: string,
    contactId: string,
  ): Promise<void> {
    try {
      // Verify the order exists and belongs to this contact
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          workspaceId,
          contactId,
        },
        include: {
          contact: true,
          shopifyStore: true,
        },
      });

      if (!order) {
        this.logger.warn(`Order not found: ${orderId}`);
        return;
      }

      // Calculate response time (time between confirmation sent and button clicked)
      const responseTimeMinutes = order.confirmationSentAt
        ? Math.floor((Date.now() - new Date(order.confirmationSentAt).getTime()) / 1000 / 60)
        : null;

      // Update order status to confirmed with response time
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
          responseTimeMinutes,
        },
      });

      // Sync to Shopify (if order is from Shopify)
      if (order.shopifyStore && order.shopifyStore.isActive) {
        try {
          // Add order note
          await this.shopifyService.addOrderNote(
            order.shopifyStore.id,
            order.externalOrderId,
            `✅ Customer confirmed via WhatsApp at ${new Date().toLocaleString()}`,
          );

          // Add confirmation tag
          await this.shopifyService.addOrderTags(
            order.shopifyStore.id,
            order.externalOrderId,
            ['whatsapp-confirmed'],
          );

          // For COD orders, create fulfillment (mark as ready to ship)
          if (order.paymentMethod === 'cod') {
            await this.shopifyService.createFulfillment(
              order.shopifyStore.id,
              order.externalOrderId,
            );
          }
        } catch (syncError: any) {
          this.logger.error(`Shopify sync failed for confirmed order: ${syncError?.message || syncError}`);
          // Continue - sync failure shouldn't block customer experience
        }
      }

      // Send thank you message
      if (order.contact.whatsappPhone) {
        const thankYouMessage = `✅ Thank you for confirming your order #${order.externalOrderNumber || order.externalOrderId}!\n\n` +
          `Your order will be delivered in 3-5 business days. We'll send you an update when it ships! 🚚\n\n` +
          `Total: ${order.currency} ${order.totalAmount}`;

        await this.sendTextMessage(workspaceId, order.contact.whatsappPhone, thankYouMessage);
      }

      // Update contact tags
      await this.updateContactTags(contactId, 'confirmed-customer');

      // Add quick-responder tag if confirmed within 1 hour
      if (responseTimeMinutes && responseTimeMinutes < 60) {
        await this.updateContactTags(contactId, 'quick-responder');
      }

      // Update contact stats
      await this.prisma.contact.update({
        where: { id: contactId },
        data: {
          totalOrders: { increment: 1 },
          lastContactAt: new Date(),
        },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          action: 'order.confirmed_by_customer',
          entityType: 'order',
          entityId: orderId,
          metadata: { 
            contactId, 
            method: 'whatsapp_button',
            responseTimeMinutes,
          },
        },
      });

      this.logger.log(`✅ Order confirmed with follow-ups: ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to confirm order ${orderId}:`, error);
    }
  }

  /**
   * Cancel an order
   */
  private async cancelOrder(
    workspaceId: string,
    orderId: string,
    contactId: string,
  ): Promise<void> {
    try {
      // Verify the order exists and belongs to this contact
      const order = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          workspaceId,
          contactId,
        },
        include: {
          contact: true,
          shopifyStore: true,
        },
      });

      if (!order) {
        this.logger.warn(`Order not found: ${orderId}`);
        return;
      }

      this.logger.log(`🔴 CANCELLING ORDER: ${orderId}, current status: ${order.status}`);

      // Update order status to cancelled
      const cancelledOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          shopifyCancelled: order.shopifyStore ? true : false,
        },
        select: { status: true, cancelledAt: true },
      });
      
      this.logger.log(`✅ ORDER CANCELLED: status="${cancelledOrder.status}", cancelled at ${cancelledOrder.cancelledAt}`);

      // Sync to Shopify (if order is from Shopify)
      if (order.shopifyStore && order.shopifyStore.isActive) {
        try {
          // Cancel order in Shopify
          await this.shopifyService.cancelShopifyOrder(
            order.shopifyStore.id,
            order.externalOrderId,
            'customer',
            `Customer cancelled via WhatsApp at ${new Date().toLocaleString()}`,
          );

          // Add cancellation tag
          await this.shopifyService.addOrderTags(
            order.shopifyStore.id,
            order.externalOrderId,
            ['whatsapp-cancelled'],
          );
        } catch (syncError: any) {
          this.logger.error(`Shopify sync failed for cancelled order: ${syncError?.message || syncError}`);
          // Continue - sync failure shouldn't block customer experience
        }
      }

      // Send acknowledgment with feedback request
      if (order.contact.whatsappPhone) {
        const refundMessage = order.paymentMethod === 'prepaid' 
          ? 'Refund will be processed in 3-5 business days.' 
          : '';
        
        const cancellationMessage = `Your order #${order.externalOrderNumber || order.externalOrderId} has been cancelled. ${refundMessage}\n\n` +
          `Could you tell us why you cancelled? This helps us improve our service.`;

        await this.sendButtonMessage(
          workspaceId,
          order.contact.whatsappPhone,
          cancellationMessage,
          [
            { id: `feedback_wrong_item_${orderId}`, title: '❌ Wrong Item' },
            { id: `feedback_changed_mind_${orderId}`, title: '🤔 Changed Mind' },
            { id: `feedback_price_${orderId}`, title: '💰 Price Issue' },
          ],
        );
      }

      // Update contact tags
      await this.updateContactTags(contactId, 'cancelled-order');

      // Check cancellation count and add high-risk tag if needed
      const cancellationCount = await this.prisma.order.count({
        where: { contactId, status: 'cancelled' },
      });

      if (cancellationCount >= 2) {
        await this.updateContactTags(contactId, 'high-cancellation-risk');
      }

      // Update contact stats
      await this.prisma.contact.update({
        where: { id: contactId },
        data: {
          lastContactAt: new Date(),
        },
      });

      // Create audit log
      await this.prisma.auditLog.create({
        data: {
          workspaceId,
          action: 'order.cancelled_by_customer',
          entityType: 'order',
          entityId: orderId,
          metadata: { 
            contactId, 
            method: 'whatsapp_button',
            cancellationCount,
          },
        },
      });

      this.logger.log(`✅ Order cancelled with follow-ups: ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel order ${orderId}:`, error);
    }
  }

  /**
   * Get workspace template message quota status
   */
  async getQuotaStatus(workspaceId: string): Promise<{
    plan: string;
    limit: number;
    used: number;
    remaining: number;
    resetAt: Date;
    canSend: boolean;
    subscriptionStatus: string;
  }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        plan: true,
        templateMessagesLimit: true,
        templateMessagesUsed: true,
        quotaResetAt: true,
        subscriptionStatus: true,
      },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace not found');
    }

    // Check if quota needs reset
    const now = new Date();
    let used = workspace.templateMessagesUsed;
    let resetAt = workspace.quotaResetAt;

    if (resetAt < now) {
      // Quota should be reset
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          templateMessagesUsed: 0,
          quotaResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      });
      used = 0;
      resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    const limit = workspace.templateMessagesLimit;
    const remaining = limit === -1 ? 999999 : Math.max(0, limit - used);
    const quotaCheck = canSendTemplateMessage(
      workspace.plan as SubscriptionPlan,
      used,
      limit
    );

    return {
      plan: workspace.plan,
      limit: limit === -1 ? -1 : limit, // -1 means unlimited
      used,
      remaining,
      resetAt,
      canSend: quotaCheck.allowed,
      subscriptionStatus: workspace.subscriptionStatus,
    };
  }

  /**
   * Get template message statistics for analytics
   */
  async getTemplateMessageStats(workspaceId: string, days: number = 30): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    totalCost: number;
    deliveryRate: number;
    readRate: number;
    byTemplate: Array<{
      templateId: string;
      templateName: string;
      count: number;
      cost: number;
    }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const messages = await this.prisma.templateMessage.findMany({
      where: {
        workspaceId,
        createdAt: { gte: since },
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    });

    const totalSent = messages.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length;
    const totalDelivered = messages.filter(m => ['delivered', 'read'].includes(m.status)).length;
    const totalRead = messages.filter(m => m.status === 'read').length;
    const totalFailed = messages.filter(m => m.status === 'failed').length;
    const totalCost = messages.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

    // Group by template
    const byTemplateMap = new Map<string, { name: string; count: number; cost: number }>();
    messages.forEach(msg => {
      if (!msg.template) return;
      const existing = byTemplateMap.get(msg.templateId) || { name: msg.template.name, count: 0, cost: 0 };
      existing.count++;
      existing.cost += msg.estimatedCost || 0;
      byTemplateMap.set(msg.templateId, existing);
    });

    const byTemplate = Array.from(byTemplateMap.entries()).map(([templateId, data]) => ({
      templateId,
      templateName: data.name,
      count: data.count,
      cost: Math.round(data.cost),
    }));

    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      totalCost: Math.round(totalCost),
      deliveryRate: Math.round(deliveryRate * 10) / 10,
      readRate: Math.round(readRate * 10) / 10,
      byTemplate,
    };
  }

  /**
   * Handle message status updates (sent, delivered, read, failed)
   */
  private async handleMessageStatuses(value: any): Promise<void> {
    const statuses = value.statuses;

    for (const status of statuses) {
      this.logger.log(`Message status update: ${status.id} -> ${status.status}`);

      // Update message status
      const message = await this.prisma.message.findUnique({
        where: { whatsappMessageId: status.id },
      });

      if (message) {
        const updateData: any = {
          status: status.status,
          updatedAt: new Date(),
        };

        if (status.status === 'delivered') {
          updateData.deliveredAt = new Date(parseInt(status.timestamp) * 1000);
        } else if (status.status === 'read') {
          updateData.readAt = new Date(parseInt(status.timestamp) * 1000);
        } else if (status.status === 'failed') {
          updateData.errorCode = status.errors?.[0]?.code?.toString();
          updateData.errorMessage = status.errors?.[0]?.title;
        }

        await this.prisma.message.update({
          where: { id: message.id },
          data: updateData,
        });
      }
    }
  }

  /**
   * Extract text content from different message types
   */
  private extractMessageContent(message: any): string {
    switch (message.type) {
      case 'text':
        return message.text.body;
      case 'button':
        return message.button.text;
      case 'interactive':
        return message.interactive.button_reply?.title || 
               message.interactive.list_reply?.title || 
               'Interactive response';
      case 'image':
        return '[Image]';
      case 'document':
        return '[Document]';
      case 'audio':
        return '[Audio]';
      case 'video':
        return '[Video]';
      default:
        return `[${message.type}]`;
    }
  }

  // ============================================================
  // HELPER METHODS FOR AUTOMATION ENHANCEMENTS
  // ============================================================

  /**
   * Update contact tags intelligently
   * Prevents duplicates and enforces max 10 tags limit
   */
  private async updateContactTags(contactId: string, newTag: string): Promise<void> {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        this.logger.warn(`Contact not found: ${contactId}`);
        return;
      }

      // Check if tag already exists
      if (contact.tags.includes(newTag)) {
        return; // Already has this tag
      }

      // Enforce max 10 tags per contact
      const updatedTags = [...contact.tags, newTag];
      if (updatedTags.length > 10) {
        // Remove oldest tag (first in array)
        updatedTags.shift();
      }

      await this.prisma.contact.update({
        where: { id: contactId },
        data: { tags: updatedTags },
      });

      this.logger.log(`Added tag "${newTag}" to contact ${contactId}`);
    } catch (error: any) {
      this.logger.error(`Failed to update contact tags: ${error?.message || error}`);
    }
  }

  /**
   * Handle feedback button responses
   * Stores cancellation reason and sends thank you
   */
  private async handleFeedbackResponse(buttonId: string, contactId: string): Promise<void> {
    try {
      // Format: feedback_<reason>_<orderId>
      // Example: feedback_changed_mind_cmnf0i3s1000dr5tebhzx7rno
      // Note: reason can contain underscores (e.g., "changed_mind", "wrong_item")
      
      // Remove "feedback_" prefix
      const withoutPrefix = buttonId.replace('feedback_', '');
      
      // Split and extract: last part is orderId, rest is reason
      const parts = withoutPrefix.split('_');
      const orderId = parts[parts.length - 1]; // Last part is always order ID
      const reason = parts.slice(0, -1).join('_'); // Everything before last part is reason

      this.logger.log(`🔍 FEEDBACK START: Reason="${reason}", OrderID="${orderId}"`);

      // Check current status BEFORE update
      const beforeUpdate = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, feedbackReason: true, updatedAt: true },
      });
      this.logger.log(`📊 BEFORE UPDATE: status="${beforeUpdate?.status}", feedback="${beforeUpdate?.feedbackReason}"`);

      // Update order with feedback reason (explicitly lock status to cancelled)
      const afterUpdate = await this.prisma.order.update({
        where: { id: orderId },
        data: { 
          feedbackReason: reason,
          status: 'cancelled', // EXPLICITLY LOCK to cancelled
        },
        select: { status: true, feedbackReason: true, updatedAt: true },
      });
      this.logger.log(`✅ AFTER UPDATE: status="${afterUpdate.status}", feedback="${afterUpdate.feedbackReason}"`);

      // Get order details to send thank you and update Shopify
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          contact: true,
          shopifyStore: true,
        },
      });

      if (order) {
        // Send thank you message
        if (order.contact.whatsappPhone) {
          const reasonText = {
            wrong_item: 'wrong item selected',
            changed_mind: 'change of plans',
            price: 'pricing concerns',
          }[reason] || 'your feedback';

          const thankYouMessage = `Thank you for letting us know about ${reasonText}. ` +
            `We'll work to improve your experience next time! 🙏`;

          await this.sendTextMessage(
            order.workspaceId,
            order.contact.whatsappPhone,
            thankYouMessage,
          );
        }

        // Update Shopify with cancellation reason
        if (order.shopifyStore && order.shopifyStore.isActive) {
          try {
            const reasonLabel = {
              wrong_item: 'Wrong Item',
              changed_mind: 'Changed Mind',
              price: 'Price Issue',
            }[reason] || reason;

            await this.shopifyService.addOrderNote(
              order.shopifyStore.id,
              order.externalOrderId,
              `💬 Customer feedback: ${reasonLabel} (via WhatsApp at ${new Date().toLocaleString()})`,
            );

            this.logger.log(`Added feedback to Shopify order ${order.externalOrderId}: ${reasonLabel}`);
          } catch (syncError: any) {
            this.logger.error(`Failed to sync feedback to Shopify: ${syncError?.message || syncError}`);
          }
        }
      }

      // Final verification: Check status after all operations
      const finalCheck = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, feedbackReason: true },
      });
      
      if (finalCheck?.status !== 'cancelled') {
        this.logger.error(`🚨 STATUS CHANGED UNEXPECTEDLY! Final status: "${finalCheck?.status}" (should be "cancelled")`);
        this.logger.error(`🚨 This indicates another process is modifying the order status!`);
      } else {
        this.logger.log(`✅ STATUS VERIFIED: Still "cancelled" with feedback "${finalCheck.feedbackReason}"`);
      }

      this.logger.log(`✅ FEEDBACK COMPLETE: ${reason} for order ${orderId}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to handle feedback response: ${error?.message || error}`);
    }
  }
}

