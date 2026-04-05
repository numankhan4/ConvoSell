/**
 * Database diagnostic script - Check what data exists
 * Run: npx ts-node src/scripts/check-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Database Diagnostic Report\n');
  console.log('='.repeat(60));

  // Check workspaces
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: {
        select: {
          members: true,
          contacts: true,
          conversations: true,
          messages: true,
          whatsappIntegrations: true,
        }
      }
    }
  });

  console.log('\n📊 WORKSPACES:');
  console.log('-'.repeat(60));
  workspaces.forEach(ws => {
    console.log(`\nWorkspace: ${ws.name} (${ws.slug})`);
    console.log(`  ID: ${ws.id}`);
    console.log(`  Created: ${ws.createdAt.toLocaleString()}`);
    console.log(`  Members: ${ws._count.members}`);
    console.log(`  Contacts: ${ws._count.contacts}`);
    console.log(`  Conversations: ${ws._count.conversations}`);
    console.log(`  Messages: ${ws._count.messages}`);
    console.log(`  WhatsApp Integrations: ${ws._count.whatsappIntegrations}`);
  });

  // Check WhatsApp integrations
  const integrations = await prisma.whatsAppIntegration.findMany({
    select: {
      id: true,
      workspaceId: true,
      phoneNumber: true,
      phoneNumberId: true,
      businessAccountId: true,
      webhookVerifyToken: true,
      tokenType: true,
      isActive: true,
      createdAt: true,
      workspace: {
        select: {
          name: true,
        }
      }
    }
  });

  console.log('\n\n📞 WHATSAPP INTEGRATIONS:');
  console.log('-'.repeat(60));
  if (integrations.length === 0) {
    console.log('  No integrations found');
  } else {
    integrations.forEach(int => {
      console.log(`\nIntegration ID: ${int.id}`);
      console.log(`  Workspace: ${int.workspace.name} (${int.workspaceId})`);
      console.log(`  Phone: ${int.phoneNumber}`);
      console.log(`  Phone ID: ${int.phoneNumberId}`);
      console.log(`  Business Account ID: ${int.businessAccountId}`);
      console.log(`  Token Type: ${int.tokenType}`);
      console.log(`  Webhook Token: ${int.webhookVerifyToken}`);
      console.log(`  Active: ${int.isActive}`);
      console.log(`  Created: ${int.createdAt.toLocaleString()}`);
    });
  }

  // Check recent conversations
  const conversations = await prisma.conversation.findMany({
    take: 10,
    orderBy: { lastMessageAt: 'desc' },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      lastMessageAt: true,
      createdAt: true,
      contact: {
        select: {
          name: true,
          whatsappPhone: true,
        }
      },
      workspace: {
        select: {
          name: true,
        }
      },
      _count: {
        select: {
          messages: true,
        }
      }
    }
  });

  console.log('\n\n💬 RECENT CONVERSATIONS (Last 10):');
  console.log('-'.repeat(60));
  if (conversations.length === 0) {
    console.log('  No conversations found');
  } else {
    conversations.forEach(conv => {
      console.log(`\nConversation ID: ${conv.id.substring(0, 20)}...`);
      console.log(`  Workspace: ${conv.workspace.name} (${conv.workspaceId.substring(0, 20)}...)`);
      console.log(`  Contact: ${conv.contact?.name || 'Unknown'} (${conv.contact?.whatsappPhone || 'N/A'})`);
      console.log(`  Status: ${conv.status}`);
      console.log(`  Messages: ${conv._count.messages}`);
      console.log(`  Last Message: ${conv.lastMessageAt?.toLocaleString() || 'Never'}`);
      console.log(`  Created: ${conv.createdAt.toLocaleString()}`);
    });
  }

  // Check total messages by workspace
  const messagesByWorkspace = await prisma.message.groupBy({
    by: ['workspaceId'],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  });

  console.log('\n\n📨 MESSAGES BY WORKSPACE:');
  console.log('-'.repeat(60));
  for (const group of messagesByWorkspace) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: group.workspaceId },
      select: { name: true, slug: true }
    });
    console.log(`  ${workspace?.name || 'Unknown'}: ${group._count.id} messages`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Diagnostic complete!\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
