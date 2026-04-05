const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete ALL test data from ALL test user workspaces
 * Useful for cleanup or resetting test environment
 */

async function deleteAllTestData() {
  try {
    console.log('🗑️  Deleting test data from ALL test user workspaces...\n');

    // Find all test users and their workspaces
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@test.com'
        }
      },
      include: {
        memberships: {
          include: {
            workspace: true
          }
        }
      }
    });

    if (testUsers.length === 0) {
      console.log('⚠️  No test users found.\n');
      return;
    }

    console.log(`Found ${testUsers.length} test user workspace(s)`);

    const workspaceIds = testUsers
      .flatMap(u => u.memberships)
      .filter(m => m.workspace)
      .map(m => m.workspace.id);

    if (workspaceIds.length === 0) {
      console.log('⚠️  No workspaces found.\n');
      return;
    }

    console.log(`\nDeleting data from ${workspaceIds.length} workspace(s)...\n`);

    let totalDeleted = {
      messages: 0,
      conversations: 0,
      orders: 0,
      contacts: 0,
      automations: 0,
      templates: 0,
    };

    // Delete data for each workspace
    for (const workspaceId of workspaceIds) {
      const workspace = testUsers
        .flatMap(u => u.memberships)
        .find(m => m.workspace?.id === workspaceId)?.workspace;

      console.log(`📦 ${workspace?.name || workspaceId}`);

      const deleted = await prisma.$transaction(async (tx) => {
        const messages = await tx.message.deleteMany({ where: { workspaceId } });
        const conversations = await tx.conversation.deleteMany({ where: { workspaceId } });
        const orders = await tx.order.deleteMany({ where: { workspaceId } });
        const contacts = await tx.contact.deleteMany({ where: { workspaceId } });
        const automations = await tx.automation.deleteMany({ where: { workspaceId } });
        const templates = await tx.whatsAppMessageTemplate.deleteMany({ where: { workspaceId } });

        return {
          messages: messages.count,
          conversations: conversations.count,
          orders: orders.count,
          contacts: contacts.count,
          automations: automations.count,
          templates: templates.count,
        };
      });

      console.log(`  ✅ Deleted: ${deleted.contacts} contacts, ${deleted.conversations} conversations, ${deleted.messages} messages, ${deleted.orders} orders, ${deleted.automations} automations, ${deleted.templates} templates\n`);

      totalDeleted.messages += deleted.messages;
      totalDeleted.conversations += deleted.conversations;
      totalDeleted.orders += deleted.orders;
      totalDeleted.contacts += deleted.contacts;
      totalDeleted.automations += deleted.automations;
      totalDeleted.templates += deleted.templates;
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL TEST DATA DELETED!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📊 Total Deleted:`);
    console.log(`   Contacts:      ${totalDeleted.contacts}`);
    console.log(`   Conversations: ${totalDeleted.conversations}`);
    console.log(`   Messages:      ${totalDeleted.messages}`);
    console.log(`   Orders:        ${totalDeleted.orders}`);
    console.log(`   Automations:   ${totalDeleted.automations}`);
    console.log(`   Templates:     ${totalDeleted.templates}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllTestData();
