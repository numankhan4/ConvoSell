import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInbox() {
  const conversations = await prisma.conversation.findMany({
    where: { workspaceId: 'cmndiib400002phbc5ymhv5fp' },
    orderBy: { lastMessageAt: 'desc' },
    take: 10,
    include: {
      contact: true,
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 2,
      },
    },
  });

  console.log('\n💬 Inbox Conversations:\n');
  console.log(`   Total found: ${conversations.length}\n`);

  if (conversations.length === 0) {
    console.log('   ❌ No inbox conversations found!');
    console.log('   Messages may have failed to send or create conversations.');
    console.log('   \n   Check:');
    console.log('   1. WhatsApp integration is active');
    console.log('   2. Worker logs for send errors');
    console.log('   3. Contact has valid WhatsApp phone number\n');
  } else {
    conversations.forEach(c => {
      console.log(`   Contact: ${c.contact.name} (${c.contact.whatsappPhone})`);
      console.log(`   Status: ${c.status}`);
      console.log(`   Unread: ${c.unreadCount}`);
      console.log(`   Last message: ${c.lastMessageAt}`);
      console.log(`   Messages (${c.messages.length}):`);
      c.messages.forEach(m => {
        console.log(`      - [${m.direction}] ${m.content?.substring(0, 50)}...`);
        console.log(`        Status: ${m.status}, Sent: ${m.sentAt}`);
      });
      console.log('   ---\n');
    });
  }

  await prisma.$disconnect();
}

checkInbox();
