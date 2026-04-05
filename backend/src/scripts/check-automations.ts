import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAutomations() {
  const automations = await prisma.automation.findMany({
    where: { workspaceId: 'cmndiib400002phbc5ymhv5fp' },
  });

  console.log('\n🤖 Automations for workspace:');
  console.log(`   Total found: ${automations.length}\n`);

  if (automations.length === 0) {
    console.log('   ❌ No automations configured!');
    console.log('   This is why messages are not being sent.');
    console.log('   \n   TO FIX:');
    console.log('   1. Go to CRM → Settings → Automations');
    console.log('   2. Click "Create Automation"');
    console.log('   3. Set trigger: "Order Created"');
    console.log('   4. Add action: "Send WhatsApp Message"');
    console.log('   5. Write message template: "Hi {contact.name}! Thanks for order #{order.number}"');
    console.log('   6. Save and enable the automation\n');
  } else {
    automations.forEach(a => {
      console.log(`   Name: ${a.name}`);
      console.log(`   Active: ${a.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Trigger: ${JSON.stringify(a.trigger, null, 2)}`);
      console.log(`   Actions: ${JSON.stringify(a.actions, null, 2)}`);
      console.log(`   Executed: ${a.executionCount} times`);
      console.log(`   Last run: ${a.lastExecutedAt || 'Never'}`);
      console.log('   ---\n');
    });
  }

  await prisma.$disconnect();
}

checkAutomations();
