import { PrismaClient } from '@prisma/client';

/**
 * Process order-related events
 * Triggers automations based on order lifecycle
 */
export async function processOrderEvent(data: any, prisma: PrismaClient) {
  const { eventType, payload } = data;

  console.log(`Processing order event: ${eventType}`);

  // Prefer workspace from payload; fallback to order lookup for older events
  let workspaceId = payload?.workspaceId as string | undefined;
  if (!workspaceId && payload?.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      select: { workspaceId: true },
    });
    workspaceId = order?.workspaceId;
  }

  if (!workspaceId) {
    console.warn('Skipping automation execution: missing workspaceId in payload and order lookup failed');
    return;
  }

  // Find active automations for this workspace
  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
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
    } catch (error: any) {
      console.error(`\n❌ Failed to execute action: ${action.type}`);
      
      // Enhanced error logging for axios/API errors
      if (error.isAxiosError && error.response) {
        console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
        console.error(`   Error Data:`, error.response.data);
        
        // Extract specific WhatsApp error if present
        if (error.response.data?.error) {
          const whatsappError = error.response.data.error;
          console.error(`   \n🔴 WhatsApp API Error:`);
          console.error(`   Code: ${whatsappError.code || 'Unknown'}`);
          console.error(`   Message: ${whatsappError.message || 'No message'}`);
          console.error(`   Type: ${whatsappError.type || 'Unknown'}`);
          
          // Specific error handling
          if (whatsappError.code === 133010) {
            console.error(`\n   💡 FIX: Phone number not registered for testing.`);
            console.error(`   Go to Meta Business Manager → WhatsApp → Phone numbers → Add test recipient`);
            console.error(`   Add: ${payload.orderId ? 'order contact phone' : 'recipient phone'}`);
          }
        }
      } else {
        console.error(`   Error:`, error.message || error);
      }
      console.error(''); // Empty line for readability
    }
  }
}

/**
 * Action: Send WhatsApp message
 */
async function executeSendMessage(action: any, payload: any, prisma: PrismaClient) {
  console.log(`\n📤 Sending WhatsApp message...`);
  
  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: { contact: true },
  });

  if (!order) {
    console.warn(`   ⚠️  Order not found: ${payload.orderId}`);
    return;
  }

  if (!order.contact.whatsappPhone) {
    console.warn(`   ⚠️  Contact missing WhatsApp phone: ${order.contact.name}`);
    return;
  }

  console.log(`   To: ${order.contact.name} (${order.contact.whatsappPhone})`);
  console.log(`   Order: ${order.externalOrderNumber || order.externalOrderId}`);

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

  // Support both legacy shape ({ message, template }) and config shape ({ config: { message, template } })
  const actionConfig = action?.config || {};
  let message = action?.template || action?.message || actionConfig.template || actionConfig.message;

  if (typeof message !== 'string' || !message.trim()) {
    console.warn('   ⚠️  Automation action has no message/template content');
    return;
  }

  // Replace template variables
  message = message.replace('{{customer_name}}', order.contact.name || 'Customer');
  message = message.replace('{{order_number}}', String(order.externalOrderNumber || order.externalOrderId || order.id));
  message = message.replace('{{order_total}}', `${order.currency || 'PKR'} ${order.totalAmount ?? 0}`);

  // Send via WhatsApp API (using axios)
  const axios = require('axios');
  const whatsappUrl = `${process.env.WHATSAPP_API_URL}/${integration.phoneNumberId}/messages`;

  const messagePayload: any = {
    messaging_product: 'whatsapp',
    to: order.contact.whatsappPhone.replace(/^\+/, ''),
    type: 'text',
    text: { body: message },
  };

  // Add buttons if specified
  if (action.useButtons || actionConfig.useButtons) {
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
  console.log(`   ✅ Message sent successfully!`);
  console.log(`   WhatsApp Message ID: ${whatsappMessageId}`);

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
    console.log(`   💬 Created new conversation: ${conversation.id}`);
  } else {
    console.log(`   💬 Using existing conversation: ${conversation.id}`);
  }

  // Store message
  await prisma.message.create({
    data: {
      workspaceId: order.workspaceId,
      conversationId: conversation.id,
      direction: 'outbound',
      type: action.useButtons || actionConfig.useButtons ? 'interactive' : 'text',
      content: message,
      whatsappMessageId,
      status: 'sent',
      sentAt: new Date(),
    },
  });
  console.log(`   💾 Message saved to database`);

  // Update order
  await prisma.order.update({
    where: { id: order.id },
    data: { confirmationSentAt: new Date() },
  });

  console.log(`   🎉 Complete! Message delivered and tracked.\n`);
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
