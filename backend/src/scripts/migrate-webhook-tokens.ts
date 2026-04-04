/**
 * Migration Script: Generate unique webhook verify tokens for existing integrations
 * 
 * Run this once after deploying the per-tenant webhook system
 * 
 * Usage:
 *   npx ts-node src/scripts/migrate-webhook-tokens.ts
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generateWebhookVerifyToken(): string {
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `whv_${randomPart}`;
}

async function main() {
  console.log('🔄 Starting webhook token migration...\n');

  // Find all integrations with placeholder or old tokens
  const integrations = await prisma.whatsAppIntegration.findMany({
    where: {
      OR: [
        { webhookVerifyToken: 'not-used-see-env' },
        { webhookVerifyToken: { startsWith: 'not-' } },
        { webhookVerifyToken: { not: { startsWith: 'whv_' } } },
      ],
    },
    select: {
      id: true,
      workspaceId: true,
      phoneNumber: true,
      webhookVerifyToken: true,
    },
  });

  console.log(`📊 Found ${integrations.length} integrations to update\n`);

  if (integrations.length === 0) {
    console.log('✅ All integrations already have unique webhook tokens!');
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const integration of integrations) {
    try {
      const newToken = generateWebhookVerifyToken();
      
      await prisma.whatsAppIntegration.update({
        where: { id: integration.id },
        data: { webhookVerifyToken: newToken },
      });

      console.log(`✅ Updated workspace ${integration.workspaceId} (${integration.phoneNumber})`);
      console.log(`   Old token: ${integration.webhookVerifyToken}`);
      console.log(`   New token: ${newToken}\n`);
      
      updated++;
    } catch (error) {
      console.error(`❌ Failed to update integration ${integration.id}:`, error);
      failed++;
    }
  }

  console.log('\n📈 Migration Summary:');
  console.log(`   ✅ Successfully updated: ${updated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${integrations.length}`);

  if (updated > 0) {
    console.log('\n⚠️  IMPORTANT: Users must update their webhook configuration in Meta:');
    console.log('   1. Each workspace now has a unique webhook URL: /api/whatsapp/webhook/:workspaceId');
    console.log('   2. Users can find their new URL and token in Settings → WhatsApp → Webhook Configuration');
    console.log('   3. They must reconfigure webhooks in Meta App Dashboard');
  }
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
