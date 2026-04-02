const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkButtonResponses() {
  try {
    console.log('Checking for button responses from customers...\n');
    
    const orderIds = [
      'cmnf0i3s1000dr5tebhzx7rno', // #1007
      'cmnf0sa8300011ul6sjrfms2e'  // #1008
    ];

    // Get all messages from the contact
    const messages = await prisma.message.findMany({
      where: {
        direction: 'inbound',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    console.log(`Found ${messages.length} inbound messages. Checking for button responses...\n`);

    let foundConfirmations = 0;
    
    for (const msg of messages) {
      // Check if it's an interactive button response
      if (msg.type === 'interactive') {
        const metadata = msg.metadata;
        if (metadata && metadata.interactive && metadata.interactive.button_reply) {
          const buttonId = metadata.interactive.button_reply.id;
          const buttonTitle = metadata.interactive.button_reply.title;
          
          console.log(`Button Response Found:`);
          console.log(`  Message ID: ${msg.id}`);
          console.log(`  Button ID: ${buttonId}`);
          console.log(`  Button Title: ${buttonTitle}`);
          console.log(`  Content: ${msg.content}`);
          console.log(`  Created: ${msg.createdAt}`);
          
          // Check if it's for our orders
          if (buttonId.startsWith('confirm_') || buttonId.startsWith('cancel_')) {
            const orderId = buttonId.replace('confirm_', '').replace('cancel_', '');
            if (orderIds.includes(orderId)) {
              console.log(`  ⚠️ THIS IS FOR ORDER: ${orderId}`);
              foundConfirmations++;
              
              // Update the order
              if (buttonId.startsWith('confirm_')) {
                await prisma.order.update({
                  where: { id: orderId },
                  data: {
                    status: 'confirmed',
                    confirmedAt: msg.createdAt,
                  },
                });
                console.log(`  ✅ Order ${orderId} marked as confirmed!`);
              } else {
                await prisma.order.update({
                  where: { id: orderId },
                  data: {
                    status: 'cancelled',
                    cancelledAt: msg.createdAt,
                  },
                });
                console.log(`  ✅ Order ${orderId} marked as cancelled!`);
              }
            }
          }
          
          console.log('');
        }
      }
    }

    console.log(`\nFixed ${foundConfirmations} orders based on button responses.`);

    // Show updated stats
    const stats = {
      total: await prisma.order.count(),
      pending: await prisma.order.count({ where: { status: 'pending' } }),
      confirmed: await prisma.order.count({ where: { status: 'confirmed' } }),
      cancelled: await prisma.order.count({ where: { status: 'cancelled' } }),
    };

    console.log('\nUpdated Statistics:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Confirmed: ${stats.confirmed}`);
    console.log(`  Cancelled: ${stats.cancelled}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkButtonResponses();
