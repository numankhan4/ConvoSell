/**
 * Clean up old test data - Remove messages/conversations/contacts before April 5, 2026
 * Run: npx ts-node src/scripts/cleanup-old-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup of old test data...\n');
  
  // Set cutoff date (April 5, 2026, 00:00:00)
  const cutoffDate = new Date('2026-04-05T00:00:00.000Z');
  console.log(`📅 Removing all data created before: ${cutoffDate.toLocaleString()}\n`);

  // Count what we'll delete
  const oldMessages = await prisma.message.count({
    where: { createdAt: { lt: cutoffDate } }
  });
  
  const oldConversations = await prisma.conversation.count({
    where: { createdAt: { lt: cutoffDate } }
  });
  
  const oldContacts = await prisma.contact.count({
    where: { createdAt: { lt: cutoffDate } }
  });

  console.log('📊 Found old test data:');
  console.log(`  - ${oldMessages} messages`);
  console.log(`  - ${oldConversations} conversations`);
  console.log(`  - ${oldContacts} contacts\n`);

  if (oldMessages === 0 && oldConversations === 0 && oldContacts === 0) {
    console.log('✅ No old data to clean up!');
    return;
  }

  console.log('⚠️  This will permanently delete the data above.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
  
  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🗑️  Deleting old data...\n');

  // Delete in correct order (messages → conversations → contacts)
  const deletedMessages = await prisma.message.deleteMany({
    where: { createdAt: { lt: cutoffDate } }
  });
  console.log(`✅ Deleted ${deletedMessages.count} messages`);

  const deletedConversations = await prisma.conversation.deleteMany({
    where: { createdAt: { lt: cutoffDate } }
  });
  console.log(`✅ Deleted ${deletedConversations.count} conversations`);

  const deletedContacts = await prisma.contact.deleteMany({
    where: { createdAt: { lt: cutoffDate } }
  });
  console.log(`✅ Deleted ${deletedContacts.count} contacts`);

  console.log('\n🎉 Cleanup complete!');
  console.log('\n📊 Current database state:');
  
  // Show what's left
  const remainingMessages = await prisma.message.count();
  const remainingConversations = await prisma.conversation.count();
  const remainingContacts = await prisma.contact.count();
  
  console.log(`  - ${remainingMessages} messages (from April 5 onwards)`);
  console.log(`  - ${remainingConversations} conversations`);
  console.log(`  - ${remainingContacts} contacts\n`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
