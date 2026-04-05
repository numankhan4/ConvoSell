import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWhatsApp() {
  const integration = await prisma.whatsAppIntegration.findFirst({
    where: { workspaceId: 'cmndiib400002phbc5ymhv5fp' },
  });

  console.log('\n📱 WhatsApp Integration:\n');

  if (!integration) {
    console.log('   ❌ NO WhatsApp integration found!');
    console.log('   This is why messages CANNOT be sent.');
    console.log('   \n   TO FIX:');
    console.log('   1. Go to CRM → Settings → WhatsApp');
    console.log('   2. Configure WhatsApp Cloud API credentials');
    console.log('   3. Enter Phone Number ID, Business Account ID, Access Token');
    console.log('   4. Save and test the connection\n');
  } else {
    console.log(`   Status: ${integration.isActive ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   Phone Number ID: ${integration.phoneNumberId || 'NOT SET'}`);
    console.log(`   Business Account ID: ${integration.businessAccountId || 'NOT SET'}`);
    console.log(`   Access Token: ${integration.accessToken ? '✅ Set' : '❌ NOT SET'}`);
    console.log(`   Created: ${integration.createdAt}`);
    
    if (!integration.isActive) {
      console.log('\n   ⚠️ Integration exists but is INACTIVE!');
      console.log('   Enable it in Settings → WhatsApp\n');
    } else if (!integration.accessToken) {
      console.log('\n   ⚠️ Integration is active but missing Access Token!');
      console.log('   Configure it in Settings → WhatsApp\n');
    } else {
      console.log('\n   ✅ Integration looks good!');
      console.log('   If messages still not sending, check worker logs for API errors.\n');
    }
  }

  await prisma.$disconnect();
}

checkWhatsApp();
