import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOutboxEvents() {
  const events = await prisma.outboxEvent.findMany({
    where: { workspaceId: 'cmndiib400002phbc5ymhv5fp' },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('\n📦 Outbox Events for workspace:');
  console.log(`   Total found: ${events.length}\n`);

  if (events.length === 0) {
    console.log('   ❌ No outbox events found!');
    console.log('   This means order.created event was never created.');
    console.log('   Check if handleOrderCreated() created the outbox event.\n');
  } else {
    events.forEach(e => {
      console.log(`   Event: ${e.eventType}`);
      console.log(`   Status: ${e.status}`);
      console.log(`   Attempts: ${e.attempts}/${e.maxAttempts}`);
      console.log(`   Created: ${e.createdAt}`);
      if (e.lastError) {
        console.log(`   Error: ${e.lastError}`);
      }
      console.log('   ---');
    });
  }

  await prisma.$disconnect();
}

checkOutboxEvents();
