const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOrders() {
  try {
    console.log('Fetching all orders...\n');
    
    const orders = await prisma.order.findMany({
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

    console.log(`Total orders found: ${orders.length}\n`);

    orders.forEach((order, index) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  ID: ${order.id}`);
      console.log(`  External Order: ${order.externalOrderNumber || order.externalOrderId}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Contact: ${order.contact.name} (${order.contact.whatsappPhone})`);
      console.log(`  Total: ${order.currency} ${order.totalAmount}`);
      console.log(`  Created: ${order.createdAt}`);
      console.log(`  Confirmed At: ${order.confirmedAt || 'NULL'}`);
      console.log(`  Confirmation Sent At: ${order.confirmationSentAt || 'NULL'}`);
      console.log('');
    });

    // Get statistics
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      completed: orders.filter(o => o.status === 'completed').length,
    };

    console.log('Statistics:');
    console.log(`  Total: ${stats.total}`);
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Confirmed: ${stats.confirmed}`);
    console.log(`  Cancelled: ${stats.cancelled}`);
    console.log(`  Completed: ${stats.completed}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrders();
