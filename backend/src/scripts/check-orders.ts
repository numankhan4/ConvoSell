import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
  const orders = await prisma.order.findMany({
    where: { workspaceId: 'cmndiib400002phbc5ymhv5fp' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { contact: true },
  });

  console.log('\n📦 Recent Orders:\n');

  if (orders.length === 0) {
    console.log('   No orders found');
  } else {
    orders.forEach(o => {
      console.log(`   Order: ${o.externalOrderNumber || o.id}`);
      console.log(`   Payment Method: ${o.paymentMethod || 'NOT SET'}`);
      console.log(`   Status: ${o.status}`);
      console.log(`   Total: ${o.totalAmount} ${o.currency || ''}`);
      console.log(`   Contact: ${o.contact?.name} (${o.contact?.whatsappPhone || 'no phone'})`);
      console.log(`   Created: ${o.createdAt}`);
      console.log('   ---\n');
    });
  }

  await prisma.$disconnect();
}

checkOrders();
