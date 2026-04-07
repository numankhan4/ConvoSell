import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ShopifyService } from '../shopify/shopify.service';

async function main() {
  const workspaceId = process.argv[2];
  const externalOrderId = process.argv[3];

  if (!workspaceId || !externalOrderId) {
    console.error('Usage: npm run shopify:resync-order -- <workspaceId> <externalOrderId>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const shopifyService = app.get(ShopifyService);
    const result = await shopifyService.resyncOrderByExternalId(workspaceId, externalOrderId);

    console.log('SUCCESS: Shopify order re-synced');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('FAILED: Could not re-sync Shopify order');
    console.error(error?.message || error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
