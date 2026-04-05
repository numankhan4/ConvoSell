import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStores() {
  console.log('\n📦 Checking Active Shopify Stores...\n');
  
  const stores = await prisma.shopifyStore.findMany({
    where: { isActive: true },
    select: { 
      shopDomain: true, 
      workspaceId: true, 
      id: true,
      clientId: true,
      scopes: true,
      oauthInstalledAt: true,
    }
  });

  if (stores.length === 0) {
    console.log('❌ No active Shopify stores found');
    console.log('   Please connect a Shopify store in Settings → Shopify tab\n');
  } else {
    stores.forEach((store, index) => {
      console.log(`Store ${index + 1}:`);
      console.log(`  Domain: ${store.shopDomain}`);
      console.log(`  Store ID: ${store.id}`);
      console.log(`  Workspace: ${store.workspaceId}`);
      console.log(`  OAuth Connected: ${store.oauthInstalledAt ? 'Yes ✅' : 'No ❌'}`);
      console.log(`  Scopes: ${store.scopes || 'N/A'}`);
      console.log('');
    });

    console.log('💡 Use this shop domain when configuring Shopify webhooks:');
    console.log(`   ${stores[0].shopDomain}\n`);
  }

  await prisma.$disconnect();
}

checkStores().catch(console.error);
