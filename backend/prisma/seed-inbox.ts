import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding inbox with sample data...');

  // Find the first workspace (or create one if none exists)
  let workspace = await prisma.workspace.findFirst();
  
  if (!workspace) {
    console.log('No workspace found. Please register a user first.');
    process.exit(1);
  }

  console.log(`📦 Using workspace: ${workspace.name} (${workspace.id})`);

  // Create sample contacts
  const contacts = await Promise.all([
    prisma.contact.upsert({
      where: {
        workspaceId_whatsappPhone: {
          workspaceId: workspace.id,
          whatsappPhone: '+923001234567',
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        whatsappPhone: '+923001234567',
        name: 'Ahmed Khan',
        email: 'ahmed@example.com',
        totalOrders: 3,
        totalSpent: 15000,
        lastContactAt: new Date(),
      },
    }),
    prisma.contact.upsert({
      where: {
        workspaceId_whatsappPhone: {
          workspaceId: workspace.id,
          whatsappPhone: '+923009876543',
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        whatsappPhone: '+923009876543',
        name: 'Fatima Ali',
        email: 'fatima@example.com',
        totalOrders: 1,
        totalSpent: 3500,
        lastContactAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    }),
    prisma.contact.upsert({
      where: {
        workspaceId_whatsappPhone: {
          workspaceId: workspace.id,
          whatsappPhone: '+923007654321',
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        whatsappPhone: '+923007654321',
        name: 'Usman Raza',
        totalOrders: 0,
        totalSpent: 0,
        lastContactAt: new Date(Date.now() - 7200000), // 2 hours ago
      },
    }),
  ]);

  console.log(`✅ Created ${contacts.length} contacts`);

  // Create conversations with messages
  for (const contact of contacts) {
    // Check if conversation exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: workspace.id,
        contactId: contact.id,
      },
    });

    if (!conversation) {
      // Create conversation
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact.id,
          status: 'open',
          lastMessageAt: new Date(),
          lastMessagePreview: '',
          unreadCount: 1,
        },
      });
    }

    // Create sample messages
    const messages: any[] = [];
    
    if (contact.name === 'Ahmed Khan') {
      messages.push(
        {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          direction: 'inbound',
          type: 'text',
          content: 'Assalam-o-Alaikum! I want to order the blue t-shirt from your store.',
          whatsappMessageId: `wamid.${Date.now()}_1`,
          status: 'delivered',
          sentAt: new Date(Date.now() - 600000), // 10 mins ago
          createdAt: new Date(Date.now() - 600000),
        },
        {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          direction: 'outbound',
          type: 'text',
          content: 'Walaikum Assalam! Sure, we have it in stock. Would you like size M or L?',
          whatsappMessageId: `wamid.${Date.now()}_2`,
          status: 'read',
          sentAt: new Date(Date.now() - 540000), // 9 mins ago
          deliveredAt: new Date(Date.now() - 530000),
          readAt: new Date(Date.now() - 520000),
          createdAt: new Date(Date.now() - 540000),
        },
        {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          direction: 'inbound',
          type: 'text',
          content: 'Size L please. What is the price with delivery to Karachi?',
          whatsappMessageId: `wamid.${Date.now()}_3`,
          status: 'delivered',
          sentAt: new Date(Date.now() - 300000), // 5 mins ago
          createdAt: new Date(Date.now() - 300000),
        },
      );
    } else if (contact.name === 'Fatima Ali') {
      messages.push(
        {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          direction: 'inbound',
          type: 'text',
          content: 'Hello! Is my order #12345 shipped yet?',
          whatsappMessageId: `wamid.${Date.now()}_4`,
          status: 'delivered',
          sentAt: new Date(Date.now() - 3600000), // 1 hour ago
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          direction: 'outbound',
          type: 'text',
          content: 'Yes! Your order was shipped yesterday. Tracking: TRK123456789',
          whatsappMessageId: `wamid.${Date.now()}_5`,
          status: 'read',
          sentAt: new Date(Date.now() - 3540000),
          deliveredAt: new Date(Date.now() - 3530000),
          readAt: new Date(Date.now() - 3520000),
          createdAt: new Date(Date.now() - 3540000),
        },
      );
    } else {
      messages.push(
        {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          direction: 'inbound',
          type: 'text',
          content: 'Hi, do you have COD available for Lahore?',
          whatsappMessageId: `wamid.${Date.now()}_6`,
          status: 'delivered',
          sentAt: new Date(Date.now() - 7200000), // 2 hours ago
          createdAt: new Date(Date.now() - 7200000),
        },
      );
    }

    // Insert messages
    await prisma.message.createMany({
      data: messages,
      skipDuplicates: true,
    });

    // Update conversation with last message
    const lastMessage = messages[messages.length - 1];
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: lastMessage.sentAt || lastMessage.createdAt,
        lastMessagePreview: lastMessage.content?.substring(0, 50) || '',
        unreadCount: lastMessage.direction === 'inbound' ? 1 : 0,
      },
    });

    console.log(`✅ Created conversation with ${contact.name} (${messages.length} messages)`);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
