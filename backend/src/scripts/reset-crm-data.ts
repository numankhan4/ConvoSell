/**
 * NUCLEAR OPTION: Delete ALL CRM data (messages, conversations, contacts)
 * This keeps your workspace and WhatsApp integration but removes all message data
 * Run: npx ts-node src/scripts/reset-crm-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💣 NUCLEAR CLEANUP - Delete ALL CRM Data\n');
  console.log('⚠️  WARNING: This will delete:');
  console.log('   - All messages');
  console.log('   - All conversations');
  console.log('   - All contacts');
  console.log('\n✅ This will KEEP:');
  console.log('   - Your workspace');
  console.log('   - Your WhatsApp integration');
  console.log('   - Your user account\n');

  // Count current data
  const messageCount = await prisma.message.count();
  const conversationCount = await prisma.conversation.count();
  const contactCount = await prisma.contact.count();

  console.log(`📊 Current data:`);
  console.log(`   - ${messageCount} messages`);
  console.log(`   - ${conversationCount} conversations`);
  console.log(`   - ${contactCount} contacts\n`);

  if (messageCount === 0 && conversationCount === 0 && contactCount === 0) {
    console.log('✅ No data to delete!');
    return;
  }

  console.log('⚠️  This action is IRREVERSIBLE!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
  
  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🗑️  Deleting all CRM data...\n');

  // Delete in correct order (child → parent)
  const deletedMessages = await prisma.message.deleteMany({});
  console.log(`✅ Deleted ${deletedMessages.count} messages`);

  const deletedConversations = await prisma.conversation.deleteMany({});
  console.log(`✅ Deleted ${deletedConversations.count} conversations`);

  const deletedContacts = await prisma.contact.deleteMany({});
  console.log(`✅ Deleted ${deletedContacts.count} contacts`);

  console.log('\n🎉 Database reset complete!');
  console.log('Your inbox is now empty and ready for new messages.\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
