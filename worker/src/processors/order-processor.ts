import { PrismaClient } from '@prisma/client';

type AutomationTarget = {
  kind: 'order' | 'cart';
  workspaceId: string;
  contactId: string;
  contact: {
    id: string;
    name: string | null;
    whatsappPhone: string | null;
  };
  order?: any;
  cart?: any;
};

/**
 * Process order/cart-related events
 * Triggers automations based on lifecycle events
 */
export async function processOrderEvent(data: any, prisma: PrismaClient) {
  const { eventType, payload } = data;

  console.log(`Processing order event: ${eventType}`);

  if (eventType === 'order.fraud_check') {
    await runFraudCheck(payload);
    return;
  }

  let workspaceId = payload?.workspaceId as string | undefined;
  if (!workspaceId && payload?.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      select: { workspaceId: true },
    });
    workspaceId = order?.workspaceId;
  }
  if (!workspaceId && payload?.cartId) {
    const cartRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "workspaceId" FROM carts WHERE id = $1 LIMIT 1`,
      payload.cartId,
    );
    workspaceId = cartRows[0]?.workspaceId;
  }

  if (!workspaceId) {
    console.warn('Skipping automation execution: missing workspaceId in payload and entity lookup failed');
    return;
  }

  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as any;
    const triggerMatches =
      trigger.type === eventType ||
      (trigger.type === 'order_created' && eventType === 'order.created') ||
      (trigger.type === 'cart_abandoned' && eventType === 'cart.abandoned');

    if (!triggerMatches) continue;
    if (!checkConditions(trigger.conditions, payload)) continue;

    console.log(`Executing automation: ${automation.name}`);

    await executeActions(automation.actions as any[], payload, prisma);

    await prisma.automation.update({
      where: { id: automation.id },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });
  }
}

async function runFraudCheck(payload: any) {
  if (!payload?.orderId) {
    console.warn('Skipping fraud check event: missing orderId');
    return;
  }

  const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || 'http://localhost:3000';
  const internalKey = process.env.INTERNAL_WORKER_KEY;

  if (!internalKey) {
    console.warn('Skipping fraud check event: INTERNAL_WORKER_KEY is not configured');
    return;
  }

  const axios = require('axios');
  await axios.post(
    `${backendUrl}/api/fraud/internal/check`,
    {
      orderId: payload.orderId,
      forceRecompute: true,
      includeGeo: true,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      deviceFingerprint: payload.deviceFingerprint,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-worker-key': internalKey,
      },
      timeout: 1500,
    },
  );

  console.log(`Fraud assessment completed for order: ${payload.orderId}`);
}

function checkConditions(conditions: any, payload: any): boolean {
  if (!conditions) return true;

  for (const [key, value] of Object.entries(conditions)) {
    if (payload[key] !== value) {
      return false;
    }
  }

  return true;
}

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
      console.error(`\nFailed to execute action: ${action.type}`);
      if (error?.isAxiosError && error?.response) {
        console.error(`Status: ${error.response.status} ${error.response.statusText}`);
        console.error('Error Data:', error.response.data);
      } else {
        console.error('Error:', error?.message || error);
      }
      console.error('');
    }
  }
}

function hasTemplateConfig(action: any): boolean {
  const actionConfig = action?.config || {};
  return Boolean(action?.templateId || actionConfig?.templateId);
}

async function resolveAutomationTarget(payload: any, prisma: PrismaClient): Promise<AutomationTarget | null> {
  if (payload?.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { contact: true },
    });
    if (!order) return null;

    return {
      kind: 'order',
      workspaceId: order.workspaceId,
      contactId: order.contactId,
      contact: order.contact,
      order,
    };
  }

  if (payload?.cartId) {
    const cartRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT c.id,
              c."workspaceId",
              c."contactId",
              c."externalCartToken",
              c."totalAmount",
              c.currency,
              c.items,
              c."recoveryUrl",
              ct.name,
              ct."whatsappPhone"
       FROM carts c
       JOIN contacts ct ON ct.id = c."contactId"
       WHERE c.id = $1
       LIMIT 1`,
      payload.cartId,
    );

    const row = cartRows[0];
    if (!row) return null;

    const cart = {
      id: row.id,
      workspaceId: row.workspaceId,
      contactId: row.contactId,
      externalCartToken: row.externalCartToken,
      totalAmount: row.totalAmount,
      currency: row.currency,
      items: row.items,
      recoveryUrl: row.recoveryUrl,
    };

    return {
      kind: 'cart',
      workspaceId: row.workspaceId,
      contactId: row.contactId,
      contact: {
        id: row.contactId,
        name: row.name,
        whatsappPhone: row.whatsappPhone,
      },
      cart,
    };
  }

  return null;
}

function resolveAutomationVariables(value: string, target: AutomationTarget): string {
  if (typeof value !== 'string') return '';

  const order = target.order;
  const cart = target.cart;
  const cartItems = Array.isArray(cart?.items) ? cart.items : [];

  const replacements: Record<string, string> = {
    '{{customer_name}}': target.contact?.name || 'Customer',
    '{{order_number}}': String(order?.externalOrderNumber || order?.externalOrderId || order?.id || ''),
    '{{order_total}}': `${order?.currency || 'PKR'} ${order?.totalAmount ?? 0}`,
    '{{payment_method}}': String(order?.paymentMethod || ''),
    '{{cart_total}}': `${cart?.currency || 'PKR'} ${cart?.totalAmount ?? 0}`,
    '{{product_count}}': String(cartItems.length),
    '{{recovery_link}}': String(cart?.recoveryUrl || ''),
  };

  let rendered = value;
  for (const [token, replacement] of Object.entries(replacements)) {
    rendered = rendered.split(token).join(replacement);
  }

  return rendered;
}

function canSendTemplateMessage(
  plan: string,
  messagesUsed: number,
  messagesLimit: number,
): { allowed: boolean; reason?: string } {
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

async function executeSendMessage(action: any, payload: any, prisma: PrismaClient) {
  const target = await resolveAutomationTarget(payload, prisma);
  if (!target) {
    console.warn('Skipping send_message: automation target not found');
    return;
  }

  if (!target.contact.whatsappPhone) {
    console.warn(`Skipping send_message: contact missing WhatsApp phone (${target.contact.name})`);
    return;
  }

  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      workspaceId: target.workspaceId,
      isActive: true,
    },
  });

  if (!integration) {
    console.warn('Skipping send_message: WhatsApp not connected');
    return;
  }

  const actionConfig = action?.config || {};
  let message = action?.template || action?.message || actionConfig.template || actionConfig.message;
  if (typeof message !== 'string' || !message.trim()) {
    console.warn('Skipping send_message: action has no content');
    return;
  }

  message = resolveAutomationVariables(message, target);

  const axios = require('axios');
  const whatsappUrl = `${process.env.WHATSAPP_API_URL}/${integration.phoneNumberId}/messages`;
  const messagePayload: any = {
    messaging_product: 'whatsapp',
    to: target.contact.whatsappPhone.replace(/^\+/, ''),
    type: 'text',
    text: { body: message },
  };

  if (action.useButtons || actionConfig.useButtons) {
    const targetId = target.kind === 'order' ? target.order.id : target.cart.id;
    messagePayload.type = 'interactive';
    messagePayload.interactive = {
      type: 'button',
      body: { text: message },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `confirm_${targetId}`, title: 'Confirm Order' } },
          { type: 'reply', reply: { id: `cancel_${targetId}`, title: 'Cancel Order' } },
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

  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: target.workspaceId,
      contactId: target.contactId,
      status: 'open',
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: target.workspaceId,
        contactId: target.contactId,
        status: 'open',
      },
    });
  }

  await prisma.message.create({
    data: {
      workspaceId: target.workspaceId,
      conversationId: conversation.id,
      direction: 'outbound',
      type: action.useButtons || actionConfig.useButtons ? 'interactive' : 'text',
      content: message,
      whatsappMessageId,
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        orderId: target.order?.id,
        cartId: target.cart?.id,
        automationKind: target.kind,
      },
    },
  });

  if (target.kind === 'order') {
    await prisma.order.update({
      where: { id: target.order.id },
      data: { confirmationSentAt: new Date() },
    });
  }
}

async function executeSendTemplateMessage(action: any, payload: any, prisma: PrismaClient) {
  const actionConfig = action?.config || {};
  const templateId = action?.templateId || actionConfig?.templateId;
  if (!templateId) {
    console.warn('Skipping send_template_message: missing templateId');
    return;
  }

  const target = await resolveAutomationTarget(payload, prisma);
  if (!target) {
    console.warn('Skipping send_template_message: automation target not found');
    return;
  }

  if (!target.contact.whatsappPhone) {
    console.warn(`Skipping send_template_message: contact missing phone (${target.contact.name})`);
    return;
  }

  const workspaceRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, plan, "templateMessagesLimit", "templateMessagesUsed", "quotaResetAt", "subscriptionStatus"
     FROM workspaces
     WHERE id = $1
     LIMIT 1`,
    target.workspaceId,
  );
  const workspace = workspaceRows[0];

  if (!workspace) {
    console.warn('Skipping send_template_message: workspace not found');
    return;
  }

  if (workspace.subscriptionStatus !== 'active' && workspace.subscriptionStatus !== 'trialing') {
    console.warn(`Skipping send_template_message: subscription inactive for workspace ${workspace.id}`);
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

  const quotaCheck = canSendTemplateMessage(workspace.plan, templateMessagesUsed, templateMessagesLimit);
  if (!quotaCheck.allowed) {
    console.warn(`Skipping send_template_message: ${quotaCheck.reason}`);
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

  if (!template || template.workspaceId !== target.workspaceId || template.status !== 'APPROVED') {
    console.warn('Skipping send_template_message: template is invalid for this workspace/status');
    return;
  }

  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      workspaceId: target.workspaceId,
      isActive: true,
    },
  });

  if (!integration) {
    console.warn('Skipping send_template_message: WhatsApp integration missing');
    return;
  }

  const headerParamsInput = action?.headerParams || actionConfig?.headerParams || [];
  const bodyParamsInput = action?.bodyParams || actionConfig?.bodyParams || [];
  const buttonParamsInput = action?.buttonParams || actionConfig?.buttonParams || [];

  const headerParams = Array.isArray(headerParamsInput)
    ? headerParamsInput.map((value: any) => resolveAutomationVariables(String(value ?? ''), target))
    : [];
  const bodyParams = Array.isArray(bodyParamsInput)
    ? bodyParamsInput.map((value: any) => resolveAutomationVariables(String(value ?? ''), target))
    : [];
  const buttonParams = Array.isArray(buttonParamsInput)
    ? buttonParamsInput.map((value: any) => resolveAutomationVariables(String(value ?? ''), target))
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
  const toPhone = target.contact.whatsappPhone.replace(/^\+/, '');
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
      target.workspaceId,
      templateId,
      target.contact.whatsappPhone,
      target.contactId,
      target.order?.id || null,
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
      target.workspaceId,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE whatsapp_message_templates
       SET "sentCount" = "sentCount" + 1,
           "updatedAt" = NOW()
       WHERE id = $1`,
      templateId,
    );

    if (target.kind === 'order') {
      await prisma.order.update({
        where: { id: target.order.id },
        data: { confirmationSentAt: new Date() },
      });
    }
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
      target.workspaceId,
      templateId,
      target.contact.whatsappPhone,
      target.contactId,
      target.order?.id || null,
      JSON.stringify(headerParams),
      JSON.stringify(bodyParams),
      JSON.stringify(buttonParams),
      error?.response?.data?.error?.message || error.message || 'Failed to send template message',
    );

    throw error;
  }
}

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

async function executeUpdateOrderStatus(action: any, payload: any, prisma: PrismaClient) {
  if (!payload.orderId) return;

  await prisma.order.update({
    where: { id: payload.orderId },
    data: { status: action.status },
  });
}
