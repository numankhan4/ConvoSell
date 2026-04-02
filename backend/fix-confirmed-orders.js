const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixConfirmedOrders() {
  try {
    console.log('Looking for orders that were sent confirmation but not confirmed...\n');
    
    // Find orders that have confirmation sent but status is still pending
    const ordersWithConfirmation = await prisma.order.findMany({
      where: {
        confirmationSentAt: { not: null },
        status: 'pending',
      },
      include: {
        contact: {
          select: {
            name: true,
            whatsappPhone: true,
          },
        },
      },
    });

    console.log(`Found ${ordersWithConfirmation.length} orders with confirmation sent but still pending.\n`);

    if (ordersWithConfirmation.length === 0) {
      console.log('No orders to fix. Checking all messages for button responses...\n');
      
      // Check messages for interactive button responses
      const buttonResponses = await prisma.message.findMany({
        where: {
          type: 'interactive',
          direction: 'inbound',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      console.log(`Found ${buttonResponses.length} interactive button response messages.\n`);
      
      buttonResponses.forEach((msg, i) => {
        console.log(`${i + 1}. Content: ${msg.content}`);
        console.log(`   Metadata: ${JSON.stringify(msg.metadata).substring(0, 200)}...`);
        console.log('');
      });
    } else {
      ordersWithConfirmation.forEach((order, index) => {
        console.log(`Order ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  External Order: ${order.externalOrderNumber || order.externalOrderId}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Contact: ${order.contact.name}`);
        console.log(`  Confirmation Sent: ${order.confirmationSentAt}`);
        console.log('');
      });

      console.log('\nTo manually confirm these orders, we need to check if customers clicked "Confirm Order" button.');
      console.log('The code has been updated to automatically process future button clicks.\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixConfirmedOrders();
