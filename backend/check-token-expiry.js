const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTokenExpiry() {
  try {
    console.log('='.repeat(60));
    console.log('TOKEN EXPIRATION VERIFICATION');
    console.log('='.repeat(60));
    console.log('');
    
    // Get WhatsApp integration
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { isActive: true },
    });

    if (!integration) {
      console.error('❌ No active WhatsApp integration found!');
      console.log('\nPlease configure WhatsApp in Settings first.');
      return;
    }

    console.log('📱 WhatsApp Integration Details:');
    console.log('─'.repeat(60));
    console.log(`Phone Number: ${integration.phoneNumber}`);
    console.log(`Phone Number ID: ${integration.phoneNumberId}`);
    console.log(`Business Account ID: ${integration.businessAccountId}`);
    console.log('');
    
    console.log('🔑 Token Information:');
    console.log('─'.repeat(60));
    console.log(`Token Type: ${integration.tokenType}`);
    console.log(`Token Length: ${integration.accessToken.length} characters`);
    console.log(`Refresh Token: ${integration.refreshToken ? 'Yes (Auto-refresh enabled)' : 'No (Manual refresh required)'}`);
    console.log('');

    // Check expiration
    if (integration.tokenExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(integration.tokenExpiresAt);
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('📅 Expiration Information:');
      console.log('─'.repeat(60));
      console.log(`Expires At: ${expiresAt.toLocaleString()}`);
      console.log(`Current Time: ${now.toLocaleString()}`);
      console.log('');

      if (daysUntilExpiry < 0) {
        console.log(`❌ TOKEN EXPIRED ${Math.abs(daysUntilExpiry)} days ago!`);
        console.log('');
        console.log('🔧 ACTION REQUIRED:');
        console.log('   1. Generate new token from Meta Business Manager');
        console.log('   2. Go to Settings → WhatsApp tab');
        console.log('   3. Update Access Token');
        console.log('   4. Set Token Type: "System User" (recommended - never expires)');
        console.log('   5. Save changes');
      } else if (daysUntilExpiry <= 7) {
        console.log(`⚠️  TOKEN EXPIRING SOON: ${daysUntilExpiry} days remaining`);
        console.log('');
        if (integration.refreshToken) {
          console.log('✅ Auto-refresh is configured - system will try to refresh automatically');
        } else {
          console.log('🔧 ACTION RECOMMENDED:');
          console.log('   Consider updating to System User token (never expires)');
          console.log('   Or add refresh token for automatic renewal');
        }
      } else {
        console.log(`✅ TOKEN IS HEALTHY: ${daysUntilExpiry} days remaining`);
      }
    } else {
      console.log('⚠️  Expiration Date Not Set:');
      console.log('─'.repeat(60));
      console.log('Token expiration date is NOT configured.');
      console.log('');
      
      if (integration.tokenType === 'system-user') {
        console.log('✅ Token Type: System User (Never Expires)');
        console.log('   No expiration date needed - these tokens don\'t expire!');
      } else {
        console.log('❌ Token Type: ' + integration.tokenType);
        console.log('');
        console.log('🔧 ACTION REQUIRED:');
        console.log('   1. Go to Settings → WhatsApp tab');
        console.log('   2. Click "Update WhatsApp Configuration"');
        console.log('   3. Set Token Type:');
        console.log('      - "System User" (recommended) = Never expires');
        console.log('      - "Long-Lived" = Expires in 60 days');
        console.log('   4. If Long-Lived: Set expiration date 60 days from when token was generated');
        console.log('   5. Save changes');
      }
    }
    console.log('');

    // Check health status
    console.log('🏥 Health Check Status:');
    console.log('─'.repeat(60));
    console.log(`Health Status: ${integration.healthStatus || 'unknown'}`);
    console.log(`Last Health Check: ${integration.lastHealthCheck ? integration.lastHealthCheck.toLocaleString() : 'Never'}`);
    
    if (integration.healthError) {
      console.log(`Health Error: ${integration.healthError}`);
    }
    console.log('');

    // Recommendations
    console.log('💡 Recommendations:');
    console.log('─'.repeat(60));
    
    if (integration.tokenType === 'system-user') {
      console.log('✅ You\'re using System User token - PERFECT for production!');
      console.log('   These tokens never expire and require no maintenance.');
    } else {
      console.log('⚠️  You\'re using ' + integration.tokenType + ' token');
      console.log('');
      console.log('For production, consider upgrading to System User token:');
      console.log('1. Go to Meta Business Manager → System Users');
      console.log('2. Create new System User (or use existing)');
      console.log('3. Assign permissions: WhatsApp Business Management');
      console.log('4. Generate token → Select "Never Expires"');
      console.log('5. Update in Settings → Set Token Type: "System User"');
    }
    console.log('');
    
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTokenExpiry();
