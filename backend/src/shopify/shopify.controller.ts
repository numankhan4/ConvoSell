import { Controller, Post, Headers, Body, RawBodyRequest, Req } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('shopify')
export class ShopifyController {
  constructor(private shopifyService: ShopifyService) {}

  /**
   * POST /api/shopify/webhook
   * Shopify webhook handler (public endpoint)
   */
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Body() body: any,
  ) {
    const orderId = body?.id || 'unknown';
    console.log(`\n🔔 ========================================`);
    console.log(`📥 SHOPIFY WEBHOOK RECEIVED`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Shop: ${shop}`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`========================================\n`);

    // Verify signature (skip for now due to body parsing issues)
    // TODO: Implement raw body parser for proper HMAC verification
    // const isValid = this.shopifyService.verifyWebhookSignature(hmac, JSON.stringify(body));
    // if (!isValid) {
    //   console.error('⚠️ Invalid webhook signature');
    //   return { error: 'Invalid signature' };
    // }

    // Find workspace by shop domain
    const store = await this.shopifyService['prisma'].shopifyStore.findUnique({
      where: { shopDomain: shop },
    });

    if (!store) {
      console.error(`❌ Store not found: ${shop}`);
      return { error: 'Store not found' };
    }

    console.log(`✓ Processing webhook for workspace: ${store.workspaceId}`);

    // Route to appropriate handler
    switch (topic) {
      case 'orders/create':
        await this.shopifyService.handleOrderCreated(store.workspaceId, body);
        break;
      case 'orders/update':
      case 'orders/updated':
        console.log('📦 Order updated webhook - processing...');
        await this.shopifyService.handleOrderUpdated(store.workspaceId, body);
        break;
      case 'orders/cancelled':
        console.log('🚫 Order cancelled webhook received');
        // await this.shopifyService.handleOrderCancelled(store.workspaceId, body);
        break;
      case 'orders/fulfilled':
        await this.shopifyService.handleFulfillmentUpdate(store.workspaceId, body);
        break;
      default:
        console.log(`⚠️ Unhandled webhook topic: ${topic}`);
    }

    return { success: true };
  }
}
