import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShopifyWebhooks() {
  console.log('🔍 Checking Shopify Webhook Configuration\n');

  // Get active workspace
  const workspaces = await prisma.workspace.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
  });

  if (workspaces.length === 0) {
    console.log('❌ No active workspaces found');
    return;
  }

  for (const workspace of workspaces) {
    console.log(`\n📦 Workspace: ${workspace.name} (${workspace.id})`);

    // Get Shopify store
    const store = await prisma.shopifyStore.findFirst({
      where: { 
        workspaceId: workspace.id,
        isActive: true,
      },
    });

    if (!store) {
      console.log('   ⚠️  No Shopify store configured');
      continue;
    }

    console.log(`   ✓ Store: ${store.shopDomain}`);
    console.log(`   ✓ Store ID: ${store.id}`);
    console.log(`   ✓ Token Type: ${store.tokenType || 'N/A'}`);
    console.log(`   ✓ Active: ${store.isActive}`);

    // Check if store has access token
    if (!store.accessToken) {
      console.log('   ❌ No access token - OAuth connection needed');
      continue;
    }

    // Fetch registered webhooks from Shopify
    try {
      console.log('\n   🔗 Fetching webhooks from Shopify...');
      const response = await fetch(`https://${store.shopDomain}/admin/api/2025-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': store.accessToken,
        },
        body: JSON.stringify({
          query: `{
            webhookSubscriptions(first: 10) {
              edges {
                node {
                  id
                  topic
                  endpoint {
                    __typename
                    ... on WebhookHttpEndpoint {
                      callbackUrl
                    }
                  }
                }
              }
            }
          }`,
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.log('   ❌ GraphQL errors:', data.errors);
        continue;
      }

      const webhooks = data.data?.webhookSubscriptions?.edges || [];
      
      if (webhooks.length === 0) {
        console.log('   ⚠️  No webhooks registered in Shopify!');
        console.log('\n   💡 Fix: Run the "Register Webhooks" button in Settings → Shopify');
        continue;
      }

      console.log(`   ✓ Found ${webhooks.length} webhook(s):\n`);

      const expectedUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/shopify/webhook`;
      
      for (const edge of webhooks) {
        const webhook = edge.node;
        const callbackUrl = webhook.endpoint?.callbackUrl || 'N/A';
        const isCorrect = callbackUrl === expectedUrl;
        const status = isCorrect ? '✅' : '❌';
        
        console.log(`   ${status} ${webhook.topic}`);
        console.log(`      URL: ${callbackUrl}`);
        
        if (!isCorrect && callbackUrl !== 'N/A') {
          console.log(`      Expected: ${expectedUrl}`);
        }
      }

      // Check for required webhooks
      const topics = webhooks.map((e: any) => e.node.topic);
      const required = ['ORDERS_CREATE', 'ORDERS_UPDATED'];
      const missing = required.filter(t => !topics.includes(t));

      if (missing.length > 0) {
        console.log(`\n   ⚠️  Missing required webhooks: ${missing.join(', ')}`);
      }

      // Check if any have wrong URL
      const wrongUrls = webhooks.filter((e: any) => {
        const url = e.node.endpoint?.callbackUrl;
        return url && url !== expectedUrl;
      });

      if (wrongUrls.length > 0) {
        console.log('\n   ❌ PROBLEM: Some webhooks have incorrect URLs!');
        console.log('   💡 Fix: Delete old webhooks and re-register using "Register Webhooks" button');
      }

    } catch (error: any) {
      console.log(`   ❌ Failed to fetch webhooks: ${error.message}`);
    }

    // Check orders in database
    const orderCount = await prisma.order.count({
      where: { 
        workspaceId: workspace.id,
        shopifyStoreId: store.id,
      },
    });

    console.log(`\n   📊 Orders in database: ${orderCount}`);
    
    if (orderCount === 0) {
      console.log('   💡 If you created orders in Shopify but see 0 here, webhooks are not working');
    }
  }

  console.log('\n✅ Check complete!\n');
}

checkShopifyWebhooks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
