const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate test data for ALL test user workspaces
 * This populates each test workspace with dummy data for testing
 */

const CUSTOMER_NAMES = [
  { firstName: 'Ahmed', lastName: 'Khan', phone: '+923001234567' },
  { firstName: 'Fatima', lastName: 'Ali', phone: '+923009876543' },
  { firstName: 'Hassan', lastName: 'Malik', phone: '+923007654321' },
  { firstName: 'Ayesha', lastName: 'Rashid', phone: '+923005555555' },
  { firstName: 'Usman', lastName: 'Siddiqui', phone: '+923006666666' },
  { firstName: 'Zainab', lastName: 'Ahmed', phone: '+923007777777' },
  { firstName: 'Ali', lastName: 'Hassan', phone: '+923008888888' },
  { firstName: 'Maryam', lastName: 'Sheikh', phone: '+923009999999' },
  { firstName: 'Bilal', lastName: 'Aziz', phone: '+923001111111' },
  { firstName: 'Sara', lastName: 'Noor', phone: '+923002222222' },
];

const MESSAGE_TEMPLATES = [
  'Hello! How can I help you today?',
  'I am interested in your products.',
  'What is the price for this item?',
  'Can we discuss bulk pricing?',
  'Please confirm my order.',
  'Is this item in stock?',
  'When will my order be delivered?',
  'Thank you for your assistance!',
];

const PRODUCT_NAMES = [
  'Wireless Earbuds',
  'Smart Watch',
  'Phone Case',
  'Laptop Bag',
  'Power Bank',
  'USB Cable',
  'Screen Protector',
  'Bluetooth Speaker',
];

async function generateDataForWorkspace(workspaceId, workspaceName) {
  console.log(`\n📦 Generating data for: ${workspaceName}`);
  
  const stats = {
    contacts: 0,
    conversations: 0,
    messages: 0,
    orders: 0,
    automations: 0,
    templates: 0,
  };

  try {
    // Create contacts
    const contacts = [];
    for (let i = 0; i < 5; i++) {  // 5 contacts per workspace
      const customer = CUSTOMER_NAMES[i];
      const phoneVariation = `${customer.phone}${workspaceId.substring(0, 4)}`; // Unique phone per workspace
      
      const existing = await prisma.contact.findFirst({
        where: { workspaceId, whatsappPhone: phoneVariation }
      });

      if (!existing) {
        const contact = await prisma.contact.create({
          data: {
            workspaceId,
            name: `${customer.firstName} ${customer.lastName}`,
            whatsappPhone: phoneVariation,
            email: `${customer.firstName.toLowerCase()}.${customer.lastName.toLowerCase()}@example.com`,
            tags: ['test-customer', 'dummy-data'],
            customFields: { firstName: customer.firstName, lastName: customer.lastName },
          },
        });
        contacts.push(contact);
        stats.contacts++;
      } else {
        contacts.push(existing);
      }
    }

    // Create conversations and messages
    for (let i = 0; i < Math.min(3, contacts.length); i++) {
      const contact = contacts[i];
      const conversation = await prisma.conversation.create({
        data: {
          workspaceId,
          contactId: contact.id,
          lastMessageAt: new Date(Date.now() - Math.random() * 86400000 * 7),
          status: ['open', 'closed'][Math.floor(Math.random() * 2)],
          unreadCount: Math.floor(Math.random() * 3),
        },
      });
      stats.conversations++;

      // Create 3-5 messages per conversation
      const msgCount = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < msgCount; j++) {
        const msgTime = new Date(Date.now() - (msgCount - j) * 3600000);
        await prisma.message.create({
          data: {
            workspaceId,
            conversationId: conversation.id,
            direction: j % 2 === 0 ? 'inbound' : 'outbound',
            content: MESSAGE_TEMPLATES[Math.floor(Math.random() * MESSAGE_TEMPLATES.length)],
            status: 'delivered',
            whatsappMessageId: `wamid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            sentAt: msgTime,
            deliveredAt: new Date(msgTime.getTime() + 1000),
            createdAt: msgTime,
          },
        });
        stats.messages++;
      }
    }

    // Create orders
    const orderStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    for (let i = 0; i < Math.min(5, contacts.length); i++) {
      const contact = contacts[i];
      const status = orderStatuses[i % orderStatuses.length];
      const quantity = 1 + Math.floor(Math.random() * 5);
      const price = 500 + Math.floor(Math.random() * 4500);
      const total = quantity * price;
      const orderNum = String(1000 + i).padStart(5, '0');

      await prisma.order.create({
        data: {
          workspaceId,
          contactId: contact.id,
          externalOrderId: `SHOP_${orderNum}`,
          externalOrderNumber: `#${orderNum}`,
          status,
          totalAmount: total,
          currency: 'PKR',
          items: [{
            name: PRODUCT_NAMES[Math.floor(Math.random() * PRODUCT_NAMES.length)],
            quantity,
            price,
            total,
          }],
          confirmedAt: status === 'confirmed' || status === 'completed' ? new Date() : null,
          confirmationSentAt: status === 'confirmed' || status === 'completed' ? new Date() : null,
        },
      });
      stats.orders++;
    }

    // Create automations
    const automations = [
      { name: 'Order Confirmation', description: 'Send confirmation when order created', trigger: { type: 'order_created' }, isActive: true },
      { name: 'Welcome Message', description: 'Welcome new customers', trigger: { type: 'contact_created' }, isActive: true },
    ];

    for (const auto of automations) {
      const existing = await prisma.automation.findFirst({
        where: { workspaceId, name: auto.name }
      });

      if (!existing) {
        await prisma.automation.create({
          data: {
            workspaceId,
            name: auto.name,
            description: auto.description,
            trigger: auto.trigger,
            isActive: auto.isActive,
            actions: [{ type: 'send_message', config: { message: 'Thank you!' } }],
          },
        });
        stats.automations++;
      }
    }

    // Create templates
    const templates = [
      { name: 'order_confirmation', category: 'UTILITY', bodyText: 'Order {{1}} confirmed. Total: PKR {{2}}', language: 'en' },
      { name: 'payment_request', category: 'UTILITY', bodyText: 'Please pay PKR {{1}} for order {{2}}', language: 'en' },
    ];

    for (const template of templates) {
      const existing = await prisma.whatsAppMessageTemplate.findFirst({
        where: { workspaceId, name: template.name }
      });

      if (!existing) {
        await prisma.whatsAppMessageTemplate.create({
          data: {
            workspaceId,
            name: template.name,
            category: template.category,
            bodyText: template.bodyText,
            language: template.language,
            variables: [],
            status: 'APPROVED',
          },
        });
        stats.templates++;
      }
    }

    console.log(`  ✅ Created: ${stats.contacts} contacts, ${stats.conversations} conversations, ${stats.messages} messages, ${stats.orders} orders, ${stats.automations} automations, ${stats.templates} templates`);
    return stats;
  } catch (error) {
    console.error(`  ❌ Error generating data for ${workspaceName}:`, error.message);
    return stats;
  }
}

async function generateAllTestData() {
  try {
    console.log('🚀 Generating test data for ALL test user workspaces...\n');

    // Find all test users
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          endsWith: '@test.com'
        }
      },
      include: {
        memberships: {
          include: {
            workspace: true
          }
        }
      }
    });

    if (testUsers.length === 0) {
      console.log('⚠️  No test users found. Run create-test-users.js first.\n');
      return;
    }

    console.log(`Found ${testUsers.length} test user(s)`);

    const totalStats = {
      workspaces: 0,
      contacts: 0,
      conversations: 0,
      messages: 0,
      orders: 0,
      automations: 0,
      templates: 0,
    };

    // Generate data for each workspace
    for (const user of testUsers) {
      const membership = user.memberships[0];
      if (membership && membership.workspace) {
        const stats = await generateDataForWorkspace(
          membership.workspace.id,
          membership.workspace.name
        );
        
        totalStats.workspaces++;
        totalStats.contacts += stats.contacts;
        totalStats.conversations += stats.conversations;
        totalStats.messages += stats.messages;
        totalStats.orders += stats.orders;
        totalStats.automations += stats.automations;
        totalStats.templates += stats.templates;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL TEST DATA GENERATED!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📊 Total Statistics:`);
    console.log(`   Workspaces:    ${totalStats.workspaces}`);
    console.log(`   Contacts:      ${totalStats.contacts}`);
    console.log(`   Conversations: ${totalStats.conversations}`);
    console.log(`   Messages:      ${totalStats.messages}`);
    console.log(`   Orders:        ${totalStats.orders}`);
    console.log(`   Automations:   ${totalStats.automations}`);
    console.log(`   Templates:     ${totalStats.templates}\n`);
    console.log('💡 All test workspaces now have dummy data for testing!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateAllTestData();
