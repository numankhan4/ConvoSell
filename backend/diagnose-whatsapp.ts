import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnosing WhatsApp Integration...\n');

  // Check WhatsApp integrations
  const integrations = await prisma.whatsAppIntegration.findMany({
    select: {
      id: true,
      phoneNumberId: true,
      phoneNumber: true,
      businessAccountId: true,
      isActive: true,
      workspaceId: true,
    },
  });

  console.log('📱 WhatsApp Integrations in Database:');
  if (integrations.length === 0) {
    console.log('   ❌ NO INTEGRATIONS FOUND!');
    console.log('   → You need to add WhatsApp integration in Settings page\n');
  } else {
    integrations.forEach((int, i) => {
      console.log(`   ${i + 1}. ID: ${int.id}`);
      console.log(`      Phone Number ID: ${int.phoneNumberId}`);
      console.log(`      Phone Number: ${int.phoneNumber}`);
      console.log(`      Business Account ID: ${int.businessAccountId}`);
      console.log(`      Workspace ID: ${int.workspaceId}`);
      console.log(`      Active: ${int.isActive ? '✅' : '❌'}`);
      console.log('');
    });
  }

  // Check recent messages
  const messages = await prisma.message.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      conversation: {
        include: {
          contact: true,
        },
      },
    },
  });

  console.log('💬 Recent Messages:');
  if (messages.length === 0) {
    console.log('   ❌ NO MESSAGES FOUND!\n');
  } else {
    messages.forEach((msg, i) => {
      console.log(`   ${i + 1}. From: ${msg.conversation.contact.name || msg.conversation.contact.whatsappPhone}`);
      console.log(`      Content: ${msg.content?.substring(0, 50)}...`);
      console.log(`      WhatsApp ID: ${msg.whatsappMessageId}`);
      console.log(`      Created: ${msg.createdAt}`);
      console.log('');
    });
  }

  // Check conversations
  const conversations = await prisma.conversation.count();
  console.log(`📊 Total Conversations: ${conversations}`);

  // Check contacts
  const contacts = await prisma.contact.count();
  console.log(`👥 Total Contacts: ${contacts}\n`);

  console.log('💡 Troubleshooting Tips:');
  console.log('   1. If "NO INTEGRATIONS FOUND" → Go to Settings and add WhatsApp integration');
  console.log('   2. If phoneNumberId doesn\'t match Meta\'s webhook → Update it in Settings');
  console.log('   3. Check Ngrok Inspector (http://127.0.0.1:4040) for actual phone_number_id from Meta');
  console.log('   4. The phoneNumberId in database MUST exactly match what Meta sends\n');
}

diagnose()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
