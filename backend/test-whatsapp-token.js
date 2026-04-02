const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function testWhatsAppToken() {
  try {
    console.log('Testing WhatsApp Integration...\n');
    
    // Get WhatsApp integration
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { isActive: true },
    });

    if (!integration) {
      console.error('❌ No active WhatsApp integration found!');
      console.log('\nPlease configure WhatsApp in Settings first.');
      return;
    }

    console.log('WhatsApp Integration Found:');
    console.log(`  Phone Number: ${integration.phoneNumber}`);
    console.log(`  Phone Number ID: ${integration.phoneNumberId}`);
    console.log(`  Business Account ID: ${integration.businessAccountId}`);
    console.log(`  Token Length: ${integration.accessToken.length} chars`);
    console.log('');

    // Test the token by calling WhatsApp API
    console.log('Testing access token with WhatsApp API...\n');

    const whatsappUrl = `https://graph.facebook.com/v17.0/${integration.phoneNumberId}`;
    
    try {
      const response = await axios.get(whatsappUrl, {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      });

      console.log('✅ ACCESS TOKEN IS VALID!');
      console.log('');
      console.log('Phone Number Details:');
      console.log(`  Verified Name: ${response.data.verified_name}`);
      console.log(`  Display Name: ${response.data.display_phone_number}`);
      console.log(`  Quality Rating: ${response.data.quality_rating || 'N/A'}`);
      console.log('');
      console.log('🎉 Your WhatsApp integration is working correctly!');
      console.log('   Automations will now send messages successfully.');

    } catch (error) {
      if (error.response) {
        const errorData = error.response.data?.error;
        
        console.error('❌ ACCESS TOKEN IS INVALID!');
        console.error('');
        console.error('Error Details:');
        console.error(`  Message: ${errorData?.message}`);
        console.error(`  Type: ${errorData?.type}`);
        console.error(`  Code: ${errorData?.code}`);
        console.error(`  Subcode: ${errorData?.error_subcode || 'N/A'}`);
        console.error('');
        
        if (errorData?.code === 190) {
          console.error('🔑 TOKEN ISSUE:');
          if (errorData?.error_subcode === 463) {
            console.error('   → Token has EXPIRED');
            console.error('   → Generate a new token from Meta Business Manager');
          } else if (errorData?.error_subcode === 467) {
            console.error('   → Token password has been changed');
          } else {
            console.error('   → Invalid or malformed token');
          }
        }
        
        console.error('');
        console.error('📖 Instructions:');
        console.error('   1. Go to Meta Business Manager (business.facebook.com)');
        console.error('   2. Navigate to WhatsApp API settings');
        console.error('   3. Generate a new access token');
        console.error('   4. Update it in Settings → WhatsApp tab');
      } else {
        console.error('❌ Network error:', error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWhatsAppToken();
