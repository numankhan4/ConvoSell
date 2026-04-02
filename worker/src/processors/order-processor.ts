import { PrismaClient } from '@prisma/client';

/**
 * Process order-related events
 * Triggers automations based on order lifecycle
 */
export async function processOrderEvent(data: any, prisma: PrismaClient) {
  const { eventType, payload } = data;

  console.log(`Processing order event: ${eventType}`);

  // Find active automations for this workspace
  const automations = await prisma.automation.findMany({
    where: {
      workspaceId: payload.workspaceId,
      isActive: true,
    },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as any;

    // Match trigger type
    if (trigger.type === eventType || trigger.type === 'order_created' && eventType === 'order.created') {
      // Check conditions
      if (checkConditions(trigger.conditions, payload)) {
        console.log(`Executing automation: ${automation.name}`);

        // Execute actions
        await executeActions(automation.actions as any[], payload, prisma);

        // Update stats
        await prisma.automation.update({
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
 * Check if conditions match
 */
function checkConditions(conditions: any, payload: any): boolean {
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
async function executeActions(actions: any[], payload: any, prisma: PrismaClient) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'send_message':
          await executeSendMessage(action, payload, prisma);
          break;
        case 'add_tag':
          await executeAddTag(action, payload, prisma);
          break;
        case 'update_order_status':
          await executeUpdateOrderStatus(action, payload, prisma);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Failed to execute action: ${action.type}`, error);
    }
  }
}

/**
 * Action: Send WhatsApp message
 */
async function executeSendMessage(action: any, payload: any, prisma: PrismaClient) {
  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: { contact: true },
  });

  if (!order || !order.contact.whatsappPhone) {
    console.warn('Cannot send message: missing order or contact phone');
    return;
  }

  // Get WhatsApp integration
  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      workspaceId: order.workspaceId,
      isActive: true,
    },
  });

  if (!integration) {
    console.warn('WhatsApp not connected');
    return;
  }

  // Replace template variables
  let message = action.template || action.message;
  message = message.replace('{{customer_name}}', order.contact.name || 'Customer');
  message = message.replace('{{order_number}}', order.externalOrderNumber || order.externalOrderId);
  message = message.replace('{{order_total}}', `${order.currency} ${order.totalAmount}`);

  // Send via WhatsApp API (using axios)
  const axios = require('axios');
  const whatsappUrl = `${process.env.WHATSAPP_API_URL}/${integration.phoneNumberId}/messages`;

  const messagePayload: any = {
    messaging_product: 'whatsapp',
    to: order.contact.whatsappPhone,
    type: 'text',
    text: { body: message },
  };

  // Add buttons if specified
  if (action.useButtons) {
    messagePayload.type = 'interactive';
    messagePayload.interactive = {
      type: 'button',
      body: { text: message },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `confirm_${order.id}`, title: 'Confirm Order' } },
          { type: 'reply', reply: { id: `cancel_${order.id}`, title: 'Cancel Order' } },
        ],
      },
    };
    delete messagePayload.text;
  }

  const response = await axios.post(whatsappUrl, messagePayload, {
    headers: {
      Authorization: `Bearer ${integration.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const whatsappMessageId = response.data.messages[0].id;

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: order.workspaceId,
      contactId: order.contactId,
      status: 'open',
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: order.workspaceId,
        contactId: order.contactId,
        status: 'open',
      },
    });
  }

  // Store message
  await prisma.message.create({
    data: {
      workspaceId: order.workspaceId,
      conversationId: conversation.id,
      direction: 'outbound',
      type: action.useButtons ? 'interactive' : 'text',
      content: message,
      whatsappMessageId,
      status: 'sent',
      sentAt: new Date(),
    },
  });

  // Update order
  await prisma.order.update({
    where: { id: order.id },
    data: { confirmationSentAt: new Date() },
  });

  console.log(`✅ Sent message to ${order.contact.whatsappPhone}`);
}

/**
 * Action: Add tag to contact
 */
async function executeAddTag(action: any, payload: any, prisma: PrismaClient) {
  if (!payload.contactId) return;

  const contact = await prisma.contact.findUnique({
    where: { id: payload.contactId },
  });

  if (contact && !contact.tags.includes(action.tagId)) {
    await prisma.contact.update({
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
async function executeUpdateOrderStatus(action: any, payload: any, prisma: PrismaClient) {
  if (!payload.orderId) return;

  await prisma.order.update({
    where: { id: payload.orderId },
    data: { status: action.status },
  });
}
