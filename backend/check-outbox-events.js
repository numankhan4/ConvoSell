const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOutboxEvents() {
  try {
    console.log('Checking Outbox Events...\n');
    
    // Get all outbox events
    const events = await prisma.outboxEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log(`Total outbox events (last 20): ${events.length}\n`);

    const stats = {
      pending: events.filter(e => e.status === 'pending').length,
      processing: events.filter(e => e.status === 'processing').length,
      completed: events.filter(e => e.status === 'completed').length,
      failed: events.filter(e => e.status === 'failed').length,
    };

    console.log('Status breakdown:');
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Processing: ${stats.processing}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Failed: ${stats.failed}\n`);

    console.log('Recent events:');
    events.slice(0, 10).forEach((event, i) => {
      console.log(`${i + 1}. Event ID: ${event.id}`);
      console.log(`   Type: ${event.eventType}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Attempts: ${event.attempts}`);
      console.log(`   Created: ${event.createdAt}`);
      console.log(`   Processed: ${event.processedAt || 'NULL'}`);
      if (event.lastError) {
        console.log(`   Error: ${event.lastError.substring(0, 100)}`);
      }
      console.log('');
    });

    // Check most recent order
    console.log('\n--- Most Recent Order ---');
    const recentOrder = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        contact: {
          select: {
            name: true,
            whatsappPhone: true,
          },
        },
      },
    });

    if (recentOrder) {
      console.log(`Order: ${recentOrder.externalOrderNumber || recentOrder.externalOrderId}`);
      console.log(`Status: ${recentOrder.status}`);
      console.log(`Contact: ${recentOrder.contact.name} (${recentOrder.contact.whatsappPhone})`);
      console.log(`Created: ${recentOrder.createdAt}`);
      console.log(`Confirmation Sent: ${recentOrder.confirmationSentAt || 'NULL'}`);
      
      // Check if there's an outbox event for this order
      const orderEvent = events.find(e => {
        const payload = e.payload;
        return payload && payload.orderId === recentOrder.id;
      });
      
      if (orderEvent) {
        console.log(`\n✅ Outbox event found for this order:`);
        console.log(`   Event ID: ${orderEvent.id}`);
        console.log(`   Status: ${orderEvent.status}`);
        console.log(`   Attempts: ${orderEvent.attempts}`);
        if (orderEvent.lastError) {
          console.log(`   Error: ${orderEvent.lastError}`);
        }
      } else {
        console.log(`\n⚠️ No outbox event found for this order!`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOutboxEvents();
