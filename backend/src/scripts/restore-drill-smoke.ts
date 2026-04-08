import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function run() {
  const prisma = new PrismaClient();

  try {
    const [workspaces, contacts, conversations, messages, orders, users] = await Promise.all([
      prisma.workspace.count(),
      prisma.contact.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.order.count(),
      prisma.user.count(),
    ]);

    const sampleWorkspace = await prisma.workspace.findFirst({
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
    });

    const sampleReads = sampleWorkspace
      ? await Promise.all([
          prisma.contact.findMany({
            where: { workspaceId: sampleWorkspace.id },
            take: 3,
            select: { id: true, name: true, whatsappPhone: true },
          }),
          prisma.order.findMany({
            where: { workspaceId: sampleWorkspace.id },
            take: 3,
            select: { id: true, status: true, totalAmount: true },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.message.findMany({
            where: { workspaceId: sampleWorkspace.id },
            take: 3,
            select: { id: true, direction: true, type: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          }),
        ])
      : [[], [], []];

    const [sampleContacts, sampleOrders, sampleMessages] = sampleReads;

    const testUser = await prisma.user.findFirst({
      where: { email: 'owner@test.com' },
      select: { email: true, password: true },
    });

    let authCheck = 'skipped';
    if (testUser) {
      const ok = await bcrypt.compare('test123', testUser.password);
      authCheck = ok ? 'pass' : 'fail';
    }

    const result = {
      status: 'ok',
      counts: {
        workspaces,
        contacts,
        conversations,
        messages,
        orders,
        users,
      },
      sampleWorkspace,
      sampleReads: {
        contacts: sampleContacts.length,
        orders: sampleOrders.length,
        messages: sampleMessages.length,
      },
      authCheck,
      checkedAt: new Date().toISOString(),
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error('restore-drill-smoke failed:', error);
  process.exit(1);
});
