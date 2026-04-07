import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
  ) {}

  /**
   * Get all automations
   */
  async getAutomations(workspaceId: string) {
    return this.prisma.automation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create automation
   */
  async createAutomation(workspaceId: string, data: {
    name: string;
    description?: string;
    trigger: any;
    actions: any[];
    isActive?: boolean;
  }) {
    return this.prisma.automation.create({
      data: {
        workspaceId,
        ...data,
      },
    });
  }

  /**
   * Toggle automation active status
   */
  async toggleAutomation(workspaceId: string, automationId: string, isActive: boolean) {
    return this.prisma.automation.update({
      where: { id: automationId },
      data: { isActive },
    });
  }

  /**
   * Execute automations for an event
   * This is called by the job worker when processing outbox events
   */
  async executeAutomationsForEvent(eventType: string, payload: any) {
    const workspaceId = payload.workspaceId;

    // Find matching automations
    const automations = await this.prisma.automation.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    for (const automation of automations) {
      const trigger = automation.trigger as any;

      // Check if trigger matches event
      if (trigger.type === eventType || trigger.type === 'order_created' && eventType === 'order.created') {
        // Check conditions
        if (this.checkConditions(trigger.conditions, payload)) {
          await this.executeActions(workspaceId, automation.actions as any[], payload);

          // Update stats
          await this.prisma.automation.update({
            where: { id: automation.id },
            data: {
              executionCount: { increment: 1 },
              lastExecutedAt: new Date(),
            },
          });
        }
      }
    }
  }

  /**
   * Check if trigger conditions match
   */
  private checkConditions(conditions: any, payload: any): boolean {
    if (!conditions) return true;

    for (const [key, value] of Object.entries(conditions)) {
      if (payload[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute automation actions
   */
  private async executeActions(workspaceId: string, actions: any[], payload: any) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'send_message':
            if (this.hasTemplateConfig(action)) {
              await this.executeSendTemplateMessage(workspaceId, action, payload);
            } else {
              await this.executeSendMessage(workspaceId, action, payload);
            }
            break;
          case 'send_template':
          case 'send_template_message':
            await this.executeSendTemplateMessage(workspaceId, action, payload);
            break;
          case 'add_tag':
            await this.executeAddTag(workspaceId, action, payload);
            break;
          case 'update_order_status':
            await this.executeUpdateOrderStatus(workspaceId, action, payload);
            break;
          default:
            this.logger.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        this.logger.error(`Failed to execute action: ${action.type}`, error);
      }
    }
  }

  private hasTemplateConfig(action: any): boolean {
    const actionConfig = action?.config || {};
    return Boolean(action?.templateId || actionConfig?.templateId);
  }

  private resolveOrderVariables(value: string, order: any): string {
    if (typeof value !== 'string') return '';

    const replacements: Record<string, string> = {
      '{{customer_name}}': order?.contact?.name || 'Customer',
      '{{order_number}}': String(order?.externalOrderNumber || order?.externalOrderId || order?.id || ''),
      '{{order_total}}': `${order?.currency || 'PKR'} ${order?.totalAmount ?? 0}`,
      '{{payment_method}}': String(order?.paymentMethod || ''),
    };

    let rendered = value;
    for (const [token, replacement] of Object.entries(replacements)) {
      rendered = rendered.split(token).join(replacement);
    }

    return rendered;
  }

  private async executeSendTemplateMessage(workspaceId: string, action: any, payload: any) {
    const actionConfig = action?.config || {};
    const templateId = action?.templateId || actionConfig?.templateId;

    if (!templateId) {
      this.logger.warn('Cannot send template message: missing templateId');
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { contact: true },
    });

    if (!order || !order.contact.whatsappPhone) {
      this.logger.warn('Cannot send template message: missing order or contact phone');
      return;
    }

    const headerParamsInput = action?.headerParams || actionConfig?.headerParams || [];
    const bodyParamsInput = action?.bodyParams || actionConfig?.bodyParams || [];
    const buttonParamsInput = action?.buttonParams || actionConfig?.buttonParams || [];

    const headerParams = Array.isArray(headerParamsInput)
      ? headerParamsInput.map((value: any) => this.resolveOrderVariables(String(value ?? ''), order))
      : [];
    const bodyParams = Array.isArray(bodyParamsInput)
      ? bodyParamsInput.map((value: any) => this.resolveOrderVariables(String(value ?? ''), order))
      : [];
    const buttonParams = Array.isArray(buttonParamsInput)
      ? buttonParamsInput.map((value: any) => this.resolveOrderVariables(String(value ?? ''), order))
      : [];

    await this.whatsappService.sendManagedTemplateMessage({
      workspaceId,
      templateId,
      recipientPhone: order.contact.whatsappPhone,
      contactId: order.contactId,
      orderId: order.id,
      headerParams,
      bodyParams,
      buttonParams,
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { confirmationSentAt: new Date() },
    });

    this.logger.log(`Automation sent template message to ${order.contact.whatsappPhone}`);
  }

  /**
   * Action: Send WhatsApp message
   */
  private async executeSendMessage(workspaceId: string, action: any, payload: any) {
    // Get order and contact
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { contact: true },
    });

    if (!order || !order.contact.whatsappPhone) {
      this.logger.warn('Cannot send message: missing order or contact phone');
      return;
    }

    // Support both legacy shape ({ message, template }) and config shape ({ config: { message, template } })
    const actionConfig = action?.config || {};
    let message = action?.template || action?.message || actionConfig.template || actionConfig.message;

    if (typeof message !== 'string' || !message.trim()) {
      this.logger.warn('Cannot send message: automation action has no message/template content');
      return;
    }

    // Replace template variables
    message = message.replace('{{customer_name}}', order.contact.name || 'Customer');
    message = message.replace('{{order_number}}', String(order.externalOrderNumber || order.externalOrderId || order.id));
    message = message.replace('{{order_total}}', `${order.currency || 'PKR'} ${order.totalAmount ?? 0}`);

    // Send via WhatsApp
    if (action.useButtons || actionConfig.useButtons) {
      await this.whatsappService.sendButtonMessage(
        workspaceId,
        order.contact.whatsappPhone,
        message,
        [
          { id: `confirm_${order.id}`, title: 'Confirm Order' },
          { id: `cancel_${order.id}`, title: 'Cancel Order' },
        ],
      );
    } else {
      await this.whatsappService.sendTextMessage(
        workspaceId,
        order.contact.whatsappPhone,
        message,
      );
    }

    // Mark confirmation sent
    await this.prisma.order.update({
      where: { id: order.id },
      data: { confirmationSentAt: new Date() },
    });

    this.logger.log(`Automation sent message to ${order.contact.whatsappPhone}`);
  }

  /**
   * Action: Add tag to contact
   */
  private async executeAddTag(workspaceId: string, action: any, payload: any) {
    if (!payload.contactId) return;

    const contact = await this.prisma.contact.findUnique({
      where: { id: payload.contactId },
    });

    if (contact && !contact.tags.includes(action.tagId)) {
      await this.prisma.contact.update({
        where: { id: payload.contactId },
        data: {
          tags: { push: action.tagId },
        },
      });
    }
  }

  /**
   * Action: Update order status
   */
  private async executeUpdateOrderStatus(workspaceId: string, action: any, payload: any) {
    if (!payload.orderId) return;

    const updateData: any = { status: action.status };

    // Set appropriate timestamp based on status
    if (action.status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (action.status === 'cancelled') {
      updateData.cancelledAt = new Date();
    } else if (action.status === 'completed') {
      updateData.deliveredAt = new Date();
    }

    await this.prisma.order.update({
      where: { id: payload.orderId },
      data: updateData,
    });

    this.logger.log(`Order ${payload.orderId} status updated to: ${action.status}`);
  }

  /**
   * Manually execute automation for a specific order
   * Used when automation wasn't triggered or for retrying
   */
  async executeManuallyForOrder(workspaceId: string, orderId: string, automationId?: string) {
    // Get the order with contact info
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, workspaceId },
      include: { contact: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // If specific automation ID provided, use that one
    // Otherwise, find matching automation based on order attributes
    let automation;
    
    if (automationId) {
      automation = await this.prisma.automation.findFirst({
        where: { id: automationId, workspaceId, isActive: true },
      });
    } else {
      // Find first matching automation for order_created trigger
      const automations = await this.prisma.automation.findMany({
        where: { workspaceId, isActive: true },
      });

      for (const auto of automations) {
        const trigger = auto.trigger as any;
        if (trigger.type === 'order_created' || trigger.type === 'order.created') {
          if (this.checkConditions(trigger.conditions, order)) {
            automation = auto;
            break;
          }
        }
      }
    }

    if (!automation) {
      throw new Error('No matching automation found');
    }

    // Execute the automation actions
    const payload = {
      orderId: order.id,
      contactId: order.contactId,
      workspaceId,
      paymentMethod: order.paymentMethod,
      status: order.status,
      totalAmount: order.totalAmount,
    };

    await this.executeActions(workspaceId, automation.actions as any[], payload);

    // Update automation stats
    await this.prisma.automation.update({
      where: { id: automation.id },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });

    this.logger.log(`Manual automation executed for order ${orderId}`);

    return {
      success: true,
      message: 'Automation executed successfully',
      automationName: automation.name,
    };
  }

  /**
   * Delete a single automation
   */
  async deleteAutomation(workspaceId: string, automationId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, workspaceId },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    await this.prisma.automation.delete({
      where: { id: automationId },
    });

    this.logger.log(`Deleted automation: ${automation.name} (${automationId})`);

    return {
      success: true,
      message: 'Automation deleted successfully',
    };
  }

  /**
   * Delete multiple automations
   */
  async deleteMultipleAutomations(workspaceId: string, automationIds: string[]) {
    const result = await this.prisma.automation.deleteMany({
      where: {
        id: { in: automationIds },
        workspaceId,
      },
    });

    this.logger.log(`Deleted ${result.count} automation(s)`);

    return {
      success: true,
      message: `${result.count} automation(s) deleted successfully`,
      count: result.count,
    };
  }
}
