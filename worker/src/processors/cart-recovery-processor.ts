import { PrismaClient } from '@prisma/client';

type CartRecoveryPolicy = {
  enabled: boolean;
  firstReminderHours: number;
  secondReminderHours: number;
  maxReminders: number;
  minCartValue: number;
};

const DEFAULT_POLICY: CartRecoveryPolicy = {
  enabled: true,
  firstReminderHours: 24,
  secondReminderHours: 48,
  maxReminders: 2,
  minCartValue: 0,
};

async function getWorkspacePolicy(prisma: PrismaClient, workspaceId: string): Promise<CartRecoveryPolicy> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT "cartRecoveryEnabled",
            "cartRecoveryFirstReminderHours",
            "cartRecoverySecondReminderHours",
            "cartRecoveryMaxReminders",
            "cartRecoveryMinValue"
     FROM workspaces
     WHERE id = $1
     LIMIT 1`,
    workspaceId,
  );

  const row = rows[0];
  if (!row) return DEFAULT_POLICY;

  return {
    enabled: row.cartRecoveryEnabled ?? DEFAULT_POLICY.enabled,
    firstReminderHours: row.cartRecoveryFirstReminderHours ?? DEFAULT_POLICY.firstReminderHours,
    secondReminderHours: row.cartRecoverySecondReminderHours ?? DEFAULT_POLICY.secondReminderHours,
    maxReminders: row.cartRecoveryMaxReminders ?? DEFAULT_POLICY.maxReminders,
    minCartValue: Number(row.cartRecoveryMinValue ?? DEFAULT_POLICY.minCartValue),
  };
}

function shouldTriggerReminder(hoursSinceAbandoned: number, reminderCount: number, policy: CartRecoveryPolicy): boolean {
  if (!policy.enabled || policy.maxReminders <= 0) return false;
  if (reminderCount >= policy.maxReminders) return false;

  if (reminderCount === 0) {
    return hoursSinceAbandoned >= policy.firstReminderHours;
  }

  if (reminderCount === 1) {
    return policy.maxReminders >= 2 && hoursSinceAbandoned >= policy.secondReminderHours;
  }

  return false;
}

export async function processCartRecoveryEscalations(prisma: PrismaClient): Promise<void> {
  const pendingCarts = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id,
            "workspaceId",
            "contactId",
            "totalAmount",
            "abandonedAt",
            "reminderCount",
            status
     FROM carts
     WHERE status = 'abandoned'
       AND "contactId" IS NOT NULL
     ORDER BY "abandonedAt" ASC
     LIMIT 500`,
  );

  if (pendingCarts.length === 0) {
    return;
  }

  const policyCache = new Map<string, CartRecoveryPolicy>();
  let enqueuedCount = 0;

  for (const cart of pendingCarts) {
    if (!policyCache.has(cart.workspaceId)) {
      const policy = await getWorkspacePolicy(prisma, cart.workspaceId);
      policyCache.set(cart.workspaceId, policy);
    }

    const policy = policyCache.get(cart.workspaceId)!;
    const totalAmount = Number(cart.totalAmount || 0);
    if (totalAmount < policy.minCartValue) {
      continue;
    }

    const abandonedAt = new Date(cart.abandonedAt);
    const hoursSinceAbandoned = (Date.now() - abandonedAt.getTime()) / (1000 * 60 * 60);
    const reminderCount = Number(cart.reminderCount || 0);

    if (!shouldTriggerReminder(hoursSinceAbandoned, reminderCount, policy)) {
      continue;
    }

    await prisma.outboxEvent.create({
      data: {
        workspaceId: cart.workspaceId,
        eventType: 'cart.abandoned',
        aggregateId: cart.id,
        payload: {
          workspaceId: cart.workspaceId,
          cartId: cart.id,
          contactId: cart.contactId,
          totalAmount,
          abandonedAt,
        },
      },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE carts
       SET "reminderCount" = "reminderCount" + 1,
           "lastReminderSentAt" = NOW(),
           "updatedAt" = NOW()
       WHERE id = $1`,
      cart.id,
    );

    enqueuedCount += 1;
  }

  if (enqueuedCount > 0) {
    console.log(`Cart recovery escalation enqueued ${enqueuedCount} cart reminder event(s)`);
  }
}
