const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMessages() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      conversation: {
        include: {
          contact: true
        }
      }
    }
  });

  console.log('\n📨 Last 5 Messages:\n');
  messages.forEach((m, i) => {
    console.log(`${i + 1}. From: ${m.conversation?.contact?.name || 'Unknown'}`);
    console.log(`   Content: ${m.content.substring(0, 60)}`);
    console.log(`   Created: ${m.createdAt}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkMessages();
