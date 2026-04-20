import { Controller, Post, Headers, Body, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { ShopifyService } from './shopify.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/guards/roles.guard';
import { WorkspaceId } from '../common/decorators/user.decorator';

@Controller('shopify')
export class ShopifyController {
  constructor(private shopifyService: ShopifyService) {}

  /**
   * POST /api/shopify/admin/resync-order
   * Force re-sync one Shopify order by external Shopify order ID.
   */
  @Post('admin/resync-order')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Roles('owner', 'admin')
  async resyncOrder(
    @WorkspaceId() workspaceId: string,
    @Body() body: { externalOrderId: string },
  ) {
    if (!body?.externalOrderId) {
      throw new BadRequestException('externalOrderId is required');
    }

    const result = await this.shopifyService.resyncOrderByExternalId(
      workspaceId,
      body.externalOrderId,
    );

    return {
      success: true,
      message: `Order ${body.externalOrderId} re-synced successfully`,
      result,
    };
  }

  /**
   * GET /api/shopify/webhook/test
   * Test endpoint to verify webhook URL is reachable
   */
  @Public()
  @Post('webhook/test')
  @SkipThrottle({ default: true })
  testWebhook(@Body() body: any) {
    console.log('\n✅ ========================================');
    console.log('🧪 TEST WEBHOOK RECEIVED');
    console.log('   Body:', JSON.stringify(body, null, 2));
    console.log('========================================\n');
    return { 
      success: true, 
      message: 'Webhook endpoint is working!',
      received: body,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/shopify/webhook
   * Shopify webhook handler (public endpoint)
   */
  @Public()
  @Post('webhook')
  @SkipThrottle({ default: true })
  async handleWebhook(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: any,
  ) {
    const orderId = body?.id || 'unknown';
    const orderNumber = body?.order_number || body?.name || 'N/A';
    
    console.log(`\n🔔 ========================================`);
    console.log(`📥 SHOPIFY WEBHOOK RECEIVED`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Shop: ${shop}`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Order Number: ${orderNumber}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`========================================\n`);

    if (!shop) {
      console.error('❌ Missing x-shopify-shop-domain header');
      return { error: 'Missing shop domain header' };
    }

    if (!topic) {
      console.error('❌ Missing x-shopify-topic header');
      return { error: 'Missing topic header' };
    }

    if (!hmac) {
      console.error('❌ Missing x-shopify-hmac-sha256 header');
      return { error: 'Missing signature header' };
    }

    const rawBody = req.rawBody?.toString('utf8');
    const signaturePayload = rawBody ?? JSON.stringify(body);
    const isValidSignature = this.shopifyService.verifyWebhookSignature(hmac, signaturePayload);
    if (!isValidSignature) {
      console.error('⚠️ Invalid webhook signature');
      return { error: 'Invalid signature' };
    }

    // Find workspace by shop domain
    console.log(`🔍 Looking up store with domain: ${shop}`);
    const store = await this.shopifyService['prisma'].shopifyStore.findUnique({
      where: { shopDomain: shop },
    });

    if (!store) {
      console.error(`❌ Store not found: ${shop}`);
      console.error(`   Make sure the shop domain in Shopify matches the one in your database`);
      return { error: 'Store not found' };
    }

    console.log(`✓ Found store: ${store.id}`);
    console.log(`✓ Processing webhook for workspace: ${store.workspaceId}`);

    try {
      // Route to appropriate handler
      switch (topic) {
        case 'orders/create':
          console.log('📝 Handling order creation...');
          await this.shopifyService.handleOrderCreated(store.workspaceId, body);
          console.log('✅ Order created successfully');
          break;
        case 'orders/update':
        case 'orders/updated':
          console.log('📦 Order updated webhook - processing...');
          await this.shopifyService.handleOrderUpdated(store.workspaceId, body);
          console.log('✅ Order updated successfully');
          break;
        case 'orders/cancelled':
          console.log('🚫 Order cancelled webhook received');
          await this.shopifyService.handleOrderCancelled(store.workspaceId, body);
          console.log('✅ Order cancellation processed');
          break;
        case 'orders/delete':
        case 'orders/deleted':
          console.log('🗑️ Order deletion webhook received');
          await this.shopifyService.handleOrderDeleted(store.workspaceId, body);
          console.log('✅ Order deletion processed');
          break;
        case 'orders/fulfilled':
          console.log('📦 Order fulfilled webhook - processing...');
          await this.shopifyService.handleFulfillmentUpdate(store.workspaceId, body);
          console.log('✅ Order fulfillment processed');
          break;
        case 'carts/abandoned':
        case 'checkouts/update':
          console.log('🛒 Cart abandoned webhook - processing...');
          await this.shopifyService.handleCartAbandoned(store.workspaceId, body);
          console.log('✅ Cart abandonment processed');
          break;
        default:
          console.log(`⚠️ Unhandled webhook topic: ${topic}`);
      }

      console.log('✅ Webhook processed successfully\n');
      return { success: true };
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      console.error('   Error details:', error instanceof Error ? error.message : error);
      console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
