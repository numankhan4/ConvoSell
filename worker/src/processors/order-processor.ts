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
          if (hasTemplateConfig(action)) {
            await executeSendTemplateMessage(action, payload, prisma);
          } else {
            await executeSendMessage(action, payload, prisma);
          }
          break;
        case 'send_template':
        case 'send_template_message':
          await executeSendTemplateMessage(action, payload, prisma);
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

function hasTemplateConfig(action: any): boolean {
  const actionConfig = action?.config || {};
  return Boolean(action?.templateId || actionConfig?.templateId);
}

function resolveOrderVariables(value: string, order: any): string {
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

function canSendTemplateMessage(plan: string, messagesUsed: number, messagesLimit: number): { allowed: boolean; reason?: string } {
  if (plan === 'free') {
    return {
      allowed: false,
      reason: 'Upgrade to Starter plan or higher to send template messages',
    };
  }

  if (plan === 'enterprise' || messagesLimit === -1) {
    return { allowed: true };
  }

  if (messagesUsed >= messagesLimit) {
    return {
      allowed: false,
      reason: `Monthly quota exceeded (${messagesUsed}/${messagesLimit}). Upgrade plan or wait for reset.`,
    };
  }

  return { allowed: true };
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

async function executeSendTemplateMessage(action: any, payload: any, prisma: PrismaClient) {
  console.log(`\n📤 Sending WhatsApp template message...`);

  const actionConfig = action?.config || {};
  const templateId = action?.templateId || actionConfig?.templateId;

  if (!templateId) {
    console.warn('   ⚠️  Missing templateId in automation action');
    return;
  }

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

  const workspaceRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, plan, "templateMessagesLimit", "templateMessagesUsed", "quotaResetAt", "subscriptionStatus"
     FROM workspaces
     WHERE id = $1
     LIMIT 1`,
    order.workspaceId,
  );
  const workspace = workspaceRows[0];

  if (!workspace) {
    console.warn(`   ⚠️  Workspace not found for order: ${order.id}`);
    return;
  }

  if (workspace.subscriptionStatus !== 'active' && workspace.subscriptionStatus !== 'trialing') {
    console.warn(`   ⚠️  Subscription is not active for workspace ${workspace.id}`);
    return;
  }

  const now = new Date();
  let templateMessagesUsed = Number(workspace.templateMessagesUsed || 0);
  let templateMessagesLimit = Number(workspace.templateMessagesLimit || 0);

  if (workspace.quotaResetAt < now) {
    await prisma.$executeRawUnsafe(
      `UPDATE workspaces
       SET "templateMessagesUsed" = 0,
           "quotaResetAt" = $2,
           "updatedAt" = NOW()
       WHERE id = $1`,
      workspace.id,
      new Date(now.getFullYear(), now.getMonth() + 1, 1),
    );
    templateMessagesUsed = 0;
    templateMessagesLimit = workspace.templateMessagesLimit;
  }

  const quotaCheck = canSendTemplateMessage(
    workspace.plan,
    templateMessagesUsed,
    templateMessagesLimit,
  );

  if (!quotaCheck.allowed) {
    console.warn(`   ⚠️  Template blocked by plan/quota: ${quotaCheck.reason}`);
    return;
  }

  const templateRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, "workspaceId", name, language, category, status, "headerType", "headerText"
     FROM whatsapp_message_templates
     WHERE id = $1
     LIMIT 1`,
    templateId,
  );
  const template = templateRows[0];

  if (!template) {
    console.warn(`   ⚠️  Template not found: ${templateId}`);
    return;
  }

  if (template.workspaceId !== order.workspaceId) {
    console.warn(`   ⚠️  Template ${templateId} does not belong to workspace ${order.workspaceId}`);
    return;
  }

  if (template.status !== 'APPROVED') {
    console.warn(`   ⚠️  Template ${template.name} is not approved (status: ${template.status})`);
    return;
  }

  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      workspaceId: order.workspaceId,
      isActive: true,
    },
  });

  if (!integration) {
    console.warn('   ⚠️  WhatsApp not connected');
    return;
  }

  const headerParamsInput = action?.headerParams || actionConfig?.headerParams || [];
  const bodyParamsInput = action?.bodyParams || actionConfig?.bodyParams || [];
  const buttonParamsInput = action?.buttonParams || actionConfig?.buttonParams || [];

  const headerParams = Array.isArray(headerParamsInput)
    ? headerParamsInput.map((value: any) => resolveOrderVariables(String(value ?? ''), order))
    : [];
  const bodyParams = Array.isArray(bodyParamsInput)
    ? bodyParamsInput.map((value: any) => resolveOrderVariables(String(value ?? ''), order))
    : [];
  const buttonParams = Array.isArray(buttonParamsInput)
    ? buttonParamsInput.map((value: any) => resolveOrderVariables(String(value ?? ''), order))
    : [];

  const components: any[] = [];

  if (template.headerType === 'TEXT' && template.headerText && headerParams.length > 0) {
    components.push({
      type: 'header',
      parameters: headerParams.map((value: string) => ({ type: 'text', text: value })),
    });
  } else if (template.headerType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.headerType) && headerParams.length > 0) {
    const mediaType = template.headerType.toLowerCase();
    components.push({
      type: 'header',
      parameters: [{ type: mediaType, [mediaType]: { link: headerParams[0] } }],
    });
  }

  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((value: string) => ({ type: 'text', text: value })),
    });
  }

  if (buttonParams.length > 0) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: buttonParams.map((value: string) => ({ type: 'text', text: value })),
    });
  }

  const axios = require('axios');
  const whatsappUrl = `${process.env.WHATSAPP_API_URL}/${integration.phoneNumberId}/messages`;
  const toPhone = order.contact.whatsappPhone.replace(/^\+/, '');
  const estimatedCost = template.category === 'MARKETING' ? 12 : 7;

  try {
    const response = await axios.post(
      whatsappUrl,
      {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components: components.length > 0 ? components : undefined,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const whatsappMessageId = response.data.messages[0].id;

    await prisma.$executeRawUnsafe(
      `INSERT INTO template_messages (
        id, "workspaceId", "templateId", "recipientPhone", "contactId", "orderId",
        "headerParams", "bodyParams", "buttonParams", "whatsappMessageId",
        status, "estimatedCost", "sentAt", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5,
        $6::jsonb, $7::jsonb, $8::jsonb, $9,
        'sent', $10, NOW(), NOW(), NOW()
      )`,
      order.workspaceId,
      templateId,
      order.contact.whatsappPhone,
      order.contactId,
      order.id,
      JSON.stringify(headerParams),
      JSON.stringify(bodyParams),
      JSON.stringify(buttonParams),
      whatsappMessageId,
      estimatedCost,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE workspaces
       SET "templateMessagesUsed" = "templateMessagesUsed" + 1,
           "updatedAt" = NOW()
       WHERE id = $1`,
      order.workspaceId,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE whatsapp_message_templates
       SET "sentCount" = "sentCount" + 1,
           "updatedAt" = NOW()
       WHERE id = $1`,
      templateId,
    );

    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationSentAt: new Date() },
    });

    console.log(`   ✅ Template sent successfully!`);
    console.log(`   Template: ${template.name}`);
    console.log(`   WhatsApp Message ID: ${whatsappMessageId}`);
  } catch (error: any) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO template_messages (
        id, "workspaceId", "templateId", "recipientPhone", "contactId", "orderId",
        "headerParams", "bodyParams", "buttonParams", status,
        "errorMessage", "failedAt", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5,
        $6::jsonb, $7::jsonb, $8::jsonb, 'failed',
        $9, NOW(), NOW(), NOW()
      )`,
      order.workspaceId,
      templateId,
      order.contact.whatsappPhone,
      order.contactId,
      order.id,
      JSON.stringify(headerParams),
      JSON.stringify(bodyParams),
      JSON.stringify(buttonParams),
      error?.response?.data?.error?.message || error.message || 'Failed to send template message',
    );

    throw error;
  }
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
