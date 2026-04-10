import { PrismaClient } from '@prisma/client';
import axios from 'axios';

type VerificationPolicy = {
  enabled: boolean;
  scope: 'cod_only' | 'all_orders';
  firstFollowupMinutes: number;
  finalTimeoutMinutes: number;
  maxFollowups: number;
  readAwareEscalation: boolean;
};

type PendingOrderRow = {
  id: string;
  workspaceId: string;
  contactId: string;
  status: string;
  paymentMethod: string;
  currency: string;
  totalAmount: number;
  externalOrderId: string;
  externalOrderNumber: string | null;
  confirmationSentAt: Date;
  reminderSentAt: Date | null;
  followupCount: number;
};

const DEFAULT_POLICY: VerificationPolicy = {
  enabled: true,
  scope: 'cod_only',
  firstFollowupMinutes: 120,
  finalTimeoutMinutes: 1440,
  maxFollowups: 2,
  readAwareEscalation: true,
};

let verificationSchemaReady: boolean | null = null;

async function isVerificationSchemaReady(prisma: PrismaClient): Promise<boolean> {
  if (verificationSchemaReady !== null) {
    return verificationSchemaReady;
  }

  try {
    const orderCols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'orders'
         AND column_name IN ('followupCount', 'verificationOutcome', 'verificationFinalizedAt')`,
    );

    const workspaceCols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'workspaces'
         AND column_name IN (
           'verificationEnabled',
           'verificationScope',
           'verificationFirstFollowupMinutes',
           'verificationFinalTimeoutMinutes',
           'verificationMaxFollowups',
           'verificationReadAwareEscalation'
         )`,
    );

    verificationSchemaReady = orderCols.length === 3 && workspaceCols.length === 6;

    if (!verificationSchemaReady) {
      console.warn(
        'Order verification schema not ready in this database. Skipping verification escalation cycle until migration is applied.',
      );
    }

    return verificationSchemaReady;
  } catch (error: any) {
    console.warn('Unable to verify order verification schema readiness:', error?.message || error);
    verificationSchemaReady = false;
    return false;
  }
}

async function getWorkspacePolicy(prisma: PrismaClient, workspaceId: string): Promise<VerificationPolicy> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "verificationEnabled",
            "verificationScope",
            "verificationFirstFollowupMinutes",
            "verificationFinalTimeoutMinutes",
            "verificationMaxFollowups",
            "verificationReadAwareEscalation"
     FROM workspaces
     WHERE id = $1
     LIMIT 1`,
    workspaceId,
  );

  const row = rows[0];
  if (!row) return DEFAULT_POLICY;

  return {
    enabled: row.verificationEnabled ?? DEFAULT_POLICY.enabled,
    scope: (row.verificationScope ?? DEFAULT_POLICY.scope) as 'cod_only' | 'all_orders',
    firstFollowupMinutes: row.verificationFirstFollowupMinutes ?? DEFAULT_POLICY.firstFollowupMinutes,
    finalTimeoutMinutes: row.verificationFinalTimeoutMinutes ?? DEFAULT_POLICY.finalTimeoutMinutes,
    maxFollowups: row.verificationMaxFollowups ?? DEFAULT_POLICY.maxFollowups,
    readAwareEscalation: row.verificationReadAwareEscalation ?? DEFAULT_POLICY.readAwareEscalation,
  };
}

function shouldVerifyOrder(order: PendingOrderRow, policy: VerificationPolicy): boolean {
  if (!policy.enabled) return false;
  if (policy.scope === 'cod_only' && (order.paymentMethod || '').toLowerCase() !== 'cod') return false;
  return true;
}

function buildFollowupMessage(order: PendingOrderRow, isRead: boolean, followupAttempt: number): string {
  const orderRef = order.externalOrderNumber || order.externalOrderId;

  if (!isRead) {
    return (
      `Hi! Just a gentle reminder about your order ${orderRef}.\n\n` +
      `Please reply YES to confirm or NO to cancel so we can process it correctly.`
    );
  }

  if (followupAttempt >= 2) {
    return (
      `Final reminder for order ${orderRef}.\n\n` +
      `Reply YES to confirm or NO to cancel. If we do not hear back, the order may be marked unresponsive.`
    );
  }

  return (
    `Quick check-in for order ${orderRef}.\n\n` +
    `Please confirm with YES or cancel with NO so we can proceed.`
  );
}

async function getLastOutboundMessageReadStatus(prisma: PrismaClient, order: PendingOrderRow): Promise<boolean> {
  const lastOutbound = await prisma.message.findFirst({
    where: {
      workspaceId: order.workspaceId,
      direction: 'outbound',
      createdAt: {
        gte: order.confirmationSentAt,
      },
      conversation: {
        contactId: order.contactId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      status: true,
      readAt: true,
    },
  });

  if (!lastOutbound) return false;
  return lastOutbound.status === 'read' || Boolean(lastOutbound.readAt);
}

async function updateContactTag(prisma: PrismaClient, contactId: string, tag: string): Promise<void> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { tags: true },
  });

  if (!contact) return;
  if (contact.tags.includes(tag)) return;

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      tags: {
        push: tag,
      },
    },
  });
}

async function sendFollowupMessage(
  prisma: PrismaClient,
  order: PendingOrderRow,
  followupAttempt: number,
  readAwareEscalation: boolean,
): Promise<boolean> {
  const contact = await prisma.contact.findUnique({
    where: { id: order.contactId },
    select: {
      id: true,
      name: true,
      whatsappPhone: true,
    },
  });

  if (!contact?.whatsappPhone) {
    console.warn(`Skipping follow-up: no phone for contact ${order.contactId}`);
    return false;
  }

  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      workspaceId: order.workspaceId,
      isActive: true,
    },
  });

  if (!integration) {
    console.warn(`Skipping follow-up: no active WhatsApp integration for workspace ${order.workspaceId}`);
    return false;
  }

  const isRead = readAwareEscalation
    ? await getLastOutboundMessageReadStatus(prisma, order)
    : false;

  const messageText = buildFollowupMessage(order, isRead, followupAttempt);
  const whatsappUrl = `${process.env.WHATSAPP_API_URL}/${integration.phoneNumberId}/messages`;

  const response = await axios.post(
    whatsappUrl,
    {
      messaging_product: 'whatsapp',
      to: contact.whatsappPhone.replace(/^\+/, ''),
      type: 'text',
      text: { body: messageText },
    },
    {
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    },
  );

  const whatsappMessageId = response.data?.messages?.[0]?.id;

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

  await prisma.message.create({
    data: {
      workspaceId: order.workspaceId,
      conversationId: conversation.id,
      direction: 'outbound',
      type: 'text',
      content: messageText,
      whatsappMessageId,
      status: 'sent',
      sentAt: new Date(),
      metadata: {
        orderId: order.id,
        verificationType: 'followup',
        followupAttempt,
        readAwareEscalation,
      },
    },
  });

  await prisma.$executeRawUnsafe(
    `UPDATE orders
     SET "reminderSentAt" = COALESCE("reminderSentAt", NOW()),
         "followupCount" = COALESCE("followupCount", 0) + 1,
         "verificationOutcome" = 'pending_response',
         "updatedAt" = NOW()
     WHERE id = $1`,
    order.id,
  );

  await prisma.auditLog.create({
    data: {
      workspaceId: order.workspaceId,
      action: 'order.verification.followup.sent',
      entityType: 'order',
      entityId: order.id,
      metadata: {
        followupAttempt,
        readAwareEscalation,
        isRead,
      },
    },
  });

  await updateContactTag(prisma, order.contactId, 'pending-verification');

  console.log(`Order ${order.id}: sent follow-up attempt ${followupAttempt}`);
  return true;
}

async function finalizeAsUnresponsive(prisma: PrismaClient, order: PendingOrderRow): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE orders
     SET status = 'fake',
         "verificationOutcome" = 'fake_suspected',
         "verificationFinalizedAt" = NOW(),
         "updatedAt" = NOW()
     WHERE id = $1`,
    order.id,
  );

  await updateContactTag(prisma, order.contactId, 'fake-order-suspected');
  await updateContactTag(prisma, order.contactId, 'unresponsive-customer');

  await prisma.auditLog.create({
    data: {
      workspaceId: order.workspaceId,
      action: 'order.verification.timeout.fake_suspected',
      entityType: 'order',
      entityId: order.id,
      metadata: {
        timeoutMinutes: Math.floor((Date.now() - order.confirmationSentAt.getTime()) / 60000),
      },
    },
  });

  await prisma.outboxEvent.create({
    data: {
      workspaceId: order.workspaceId,
      eventType: 'order.verification.timeout',
      aggregateId: order.id,
      payload: {
        workspaceId: order.workspaceId,
        orderId: order.id,
        outcome: 'fake_suspected',
      },
    },
  });

  console.log(`Order ${order.id}: finalized as fake_suspected`);
}

export async function processOrderVerificationEscalations(prisma: PrismaClient): Promise<void> {
  const schemaReady = await isVerificationSchemaReady(prisma);
  if (!schemaReady) {
    return;
  }

  const pendingOrders = await prisma.$queryRawUnsafe<PendingOrderRow[]>(
    `SELECT id,
            "workspaceId",
            "contactId",
            status,
            "paymentMethod",
            currency,
            "totalAmount",
            "externalOrderId",
            "externalOrderNumber",
            "confirmationSentAt",
            "reminderSentAt",
            "followupCount"
     FROM orders
     WHERE status = 'pending'
       AND "confirmationSentAt" IS NOT NULL
     ORDER BY "confirmationSentAt" ASC
     LIMIT 200`,
  );

  for (const order of pendingOrders) {
    try {
      const policy = await getWorkspacePolicy(prisma, order.workspaceId);
      if (!shouldVerifyOrder(order, policy)) {
        continue;
      }

      const elapsedMinutes = Math.floor((Date.now() - new Date(order.confirmationSentAt).getTime()) / 60000);
      const midpointFollowupMinutes = Math.floor((policy.firstFollowupMinutes + policy.finalTimeoutMinutes) / 2);
      const followupThresholds = policy.maxFollowups >= 2
        ? [policy.firstFollowupMinutes, midpointFollowupMinutes]
        : [policy.firstFollowupMinutes];

      if (elapsedMinutes >= policy.finalTimeoutMinutes) {
        await finalizeAsUnresponsive(prisma, order);
        continue;
      }

      if (order.followupCount >= policy.maxFollowups) {
        continue;
      }

      const nextAttempt = order.followupCount + 1;
      const requiredElapsed = followupThresholds[order.followupCount];

      if (requiredElapsed !== undefined && elapsedMinutes >= requiredElapsed) {
        await sendFollowupMessage(
          prisma,
          order,
          nextAttempt,
          policy.readAwareEscalation,
        );
      }
    } catch (error: any) {
      console.error(`Verification escalation failed for order ${order.id}:`, error?.message || error);
    }
  }
}
