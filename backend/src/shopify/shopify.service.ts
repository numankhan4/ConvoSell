import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private httpService: HttpService,
  ) {}

  /**
   * Verify Shopify webhook HMAC signature
   */
  verifyWebhookSignature(hmac: string, body: string): boolean {
    const secret = this.config.get('SHOPIFY_WEBHOOK_SECRET');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    return hmac === hash;
  }

  /**
   * Handle Shopify order creation webhook
   */
  async handleOrderCreated(workspaceId: string, orderData: any) {
    this.logger.log(`Processing Shopify order: ${orderData.id}`);
    
    // Log order data for debugging
    this.logger.debug(`Order customer data: ${JSON.stringify({
      customerPhone: orderData.customer?.phone,
      shippingPhone: orderData.shipping_address?.phone,
      billingPhone: orderData.billing_address?.phone,
      customerEmail: orderData.customer?.email,
    })}`);

    // Find or create contact from customer data
    // Extract phone from multiple possible sources
    const customerPhone = this.extractPhoneFromOrder(orderData);
    this.logger.log(`Extracted phone: ${customerPhone || 'none'} from order ${orderData.id}`);

    let contact = await this.prisma.contact.findFirst({
      where: {
        workspaceId,
        OR: [
          { email: orderData.customer?.email },
          ...(customerPhone ? [{ whatsappPhone: customerPhone }] : []),
        ],
      },
    });

    if (!contact && orderData.customer) {
      contact = await this.prisma.contact.create({
        data: {
          workspaceId,
          name: orderData.customer.first_name + ' ' + orderData.customer.last_name,
          email: orderData.customer.email,
          whatsappPhone: customerPhone || undefined,
        },
      });
      this.logger.log(`Contact created with phone: ${customerPhone || 'none'}`);
    } else if (contact && customerPhone && !contact.whatsappPhone) {
      // Update existing contact with phone number if missing
      contact = await this.prisma.contact.update({
        where: { id: contact.id },
        data: { whatsappPhone: customerPhone },
      });
      this.logger.log(`Updated contact with phone: ${customerPhone}`);
    }

    if (!contact) {
      this.logger.warn('Cannot create order without customer contact');
      return;
    }

    // Find Shopify store integration
    const store = await this.prisma.shopifyStore.findFirst({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    // Detect payment method from Shopify data
    const paymentMethod = this.detectPaymentMethod(orderData);
    
    // Check if order already exists (prevent duplicates from multiple webhooks)
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        workspaceId,
        externalOrderId: orderData.id.toString(),
      },
    });

    let order;
    let isNewOrder = false;

    if (existingOrder) {
      // Update existing order (duplicate webhook protection)
      this.logger.log(`Order already exists: ${existingOrder.id} (status: ${existingOrder.status})`);
      
      // ⚠️ IMPORTANT: Don't overwrite WhatsApp-managed statuses
      const shouldUpdateStatus = !['confirmed', 'cancelled', 'completed'].includes(existingOrder.status);
      
      const updateData: any = {
        contactId: contact.id,
        paymentMethod,
        totalAmount: parseFloat(orderData.total_price),
        items: orderData.line_items || [],
        shippingAddress: orderData.shipping_address,
      };

      if (shouldUpdateStatus) {
        updateData.status = orderData.financial_status === 'paid' ? 'confirmed' : 'pending';
        this.logger.log(`Updating status: ${existingOrder.status} → ${updateData.status}`);
      } else {
        this.logger.log(`⚠️ Preserving WhatsApp status: ${existingOrder.status}`);
      }

      order = await this.prisma.order.update({
        where: { id: existingOrder.id },
        data: updateData,
      });
    } else {
      // Create new order
      this.logger.log(`Creating new order: ${orderData.id}`);
      isNewOrder = true;
      order = await this.prisma.order.create({
        data: {
          workspaceId,
          contactId: contact.id,
          shopifyStoreId: store?.id,
          externalOrderId: orderData.id.toString(),
          externalOrderNumber: orderData.name,
          status: 'pending',
          paymentMethod,
          totalAmount: parseFloat(orderData.total_price),
          currency: orderData.currency,
          items: orderData.line_items || [],
          shippingAddress: orderData.shipping_address,
        },
      });
    }

    // Only create outbox event for NEW orders (to trigger automation once)
    if (isNewOrder) {
      await this.prisma.outboxEvent.create({
        data: {
          workspaceId,
          eventType: 'order.created',
          aggregateId: order.id,
          payload: {
            orderId: order.id,
            contactId: contact.id,
            paymentMethod: order.paymentMethod,
          },
        },
      });
      this.logger.log(`Order created with outbox event: ${order.id}`);
    } else {
      this.logger.log(`Order updated (no new automation): ${order.id}`);
    }

    return order;
  }

  /**
   * Handle Shopify order updated webhook
   * If order doesn't exist, create it (handles late webhook delivery)
   */
  async handleOrderUpdated(workspaceId: string, orderData: any) {
    this.logger.log(`Processing Shopify order update: ${orderData.id}`);

    // Check if order already exists
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        workspaceId,
        externalOrderId: orderData.id.toString(),
      },
    });

    if (existingOrder) {
      // Update existing order
      this.logger.log(`Updating existing order: ${existingOrder.id} (current status: ${existingOrder.status})`);
      
      // ⚠️ IMPORTANT: Don't overwrite internal lifecycle statuses
      // Our system manages: confirmed, cancelled (via WhatsApp interactions)
      // Only update status if it's still pending or if Shopify explicitly cancelled
      const shouldUpdateStatus = !['confirmed', 'cancelled', 'completed'].includes(existingOrder.status);
      
      const updateData: any = {
        totalAmount: parseFloat(orderData.total_price),
        items: orderData.line_items || [],
        shippingAddress: orderData.shipping_address,
      };

      // Only update status if we haven't confirmed/cancelled via WhatsApp
      if (shouldUpdateStatus) {
        // Check Shopify's cancellation status
        if (orderData.cancelled_at) {
          updateData.status = 'cancelled';
          updateData.cancelledAt = new Date(orderData.cancelled_at);
        } else {
          updateData.status = orderData.financial_status === 'paid' ? 'confirmed' : 'pending';
        }
        this.logger.log(`Status updated from webhook: ${existingOrder.status} → ${updateData.status}`);
      } else {
        this.logger.log(`⚠️ Skipping status update - order is ${existingOrder.status} (managed internally)`);
      }

      await this.prisma.order.update({
        where: { id: existingOrder.id },
        data: updateData,
      });
      return existingOrder;
    } else {
      // Order doesn't exist yet, create it (same as handleOrderCreated)
      this.logger.log(`Order not found, creating new order: ${orderData.id}`);
      return this.handleOrderCreated(workspaceId, orderData);
    }
  }

  /**
   * Process order fulfillment update
   */
  async handleFulfillmentUpdate(workspaceId: string, fulfillmentData: any) {
    const order = await this.prisma.order.findFirst({
      where: {
        workspaceId,
        externalOrderId: fulfillmentData.order_id.toString(),
      },
    });

    if (!order) {
      this.logger.warn(`Order not found: ${fulfillmentData.order_id}`);
      return;
    }

    // Update order status based on fulfillment
    if (fulfillmentData.status === 'success') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          deliveredAt: new Date(),
        },
      });
    }
  }

  /**
   * Detect payment method from Shopify order data
   * Handles multiple COD detection scenarios
   */
  private detectPaymentMethod(orderData: any): string {
    // Check payment_gateway_names array
    if (orderData.payment_gateway_names && Array.isArray(orderData.payment_gateway_names)) {
      const gateways = orderData.payment_gateway_names.map((g: string) => g.toLowerCase());
      if (gateways.some((g: string) => 
        g.includes('cash') || 
        g.includes('cod') || 
        g.includes('delivery')
      )) {
        return 'cod';
      }
    }

    // Check gateway field (legacy)
    if (orderData.gateway && typeof orderData.gateway === 'string') {
      const gateway = orderData.gateway.toLowerCase();
      if (gateway.includes('cash') || gateway.includes('cod')) {
        return 'cod';
      }
    }

    // Check payment_terms (Shopify 2024+)
    if (orderData.payment_terms) {
      const termsName = orderData.payment_terms.payment_terms_name || '';
      const termsType = orderData.payment_terms.payment_terms_type || '';
      
      if (termsName.toLowerCase().includes('fulfillment') || 
          termsType.toLowerCase().includes('fulfillment')) {
        return 'cod';
      }
    }

    // Check financial_status - if pending and no gateway, likely COD
    if (orderData.financial_status === 'pending' && 
        !orderData.payment_gateway_names?.length) {
      return 'cod';
    }

    // If financial_status is paid, it's prepaid
    if (orderData.financial_status === 'paid' || 
        orderData.financial_status === 'authorized') {
      return 'prepaid';
    }

    // Default to prepaid for safety
    return 'prepaid';
  }

  /**
   * Extract and normalize phone from multiple sources in Shopify order
   * Tries: customer.phone → shipping_address.phone → billing_address.phone
   */
  private extractPhoneFromOrder(orderData: any): string | null {
    const phoneFields = [
      orderData.customer?.phone,
      orderData.shipping_address?.phone,
      orderData.billing_address?.phone,
    ];

    for (const phone of phoneFields) {
      const normalized = this.normalizePhone(phone);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhone(phone: string | null): string | null {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with country code (Pakistan = 92)
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    }

    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  // ============================================================
  // SHOPIFY API - BIDIRECTIONAL SYNC METHODS
  // ============================================================

  /**
   * Get Shopify store credentials and construct API client
   */
  private async getShopifyClient(shopifyStoreId: string) {
    const store = await this.prisma.shopifyStore.findUnique({
      where: { id: shopifyStoreId },
    });

    if (!store || !store.accessToken) {
      throw new BadRequestException('Shopify store not found or not authenticated');
    }

    const baseUrl = `https://${store.shopDomain}/admin/api/2024-01`;
    const headers = {
      'X-Shopify-Access-Token': store.accessToken,
      'Content-Type': 'application/json',
    };

    return { baseUrl, headers, store };
  }

  /**
   * Add note to Shopify order
   * Used to track WhatsApp confirmation/cancellation
   */
  async addOrderNote(
    shopifyStoreId: string,
    externalOrderId: string,
    note: string,
  ): Promise<void> {
    try {
      const { baseUrl, headers } = await this.getShopifyClient(shopifyStoreId);

      // Get current order first to append to existing notes
      const getResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/orders/${externalOrderId}.json`, { headers }),
      );

      const currentNote = getResponse.data.order.note || '';
      const updatedNote = currentNote 
        ? `${currentNote}\n\n${note}` 
        : note;

      // Update order with appended note
      await firstValueFrom(
        this.httpService.put(
          `${baseUrl}/orders/${externalOrderId}.json`,
          {
            order: {
              id: parseInt(externalOrderId),
              note: updatedNote,
            },
          },
          { headers },
        ),
      );

      this.logger.log(`Added note to Shopify order ${externalOrderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to add note to Shopify order ${externalOrderId}: ${error.message}`,
        error.response?.data ? JSON.stringify(error.response.data) : error.stack,
      );
      // Don't throw - sync failure shouldn't block confirmation
    }
  }

  /**
   * Add tags to Shopify order
   * Used to mark orders as 'whatsapp-confirmed', 'whatsapp-cancelled', etc.
   */
  async addOrderTags(
    shopifyStoreId: string,
    externalOrderId: string,
    tags: string[],
  ): Promise<void> {
    try {
      const { baseUrl, headers } = await this.getShopifyClient(shopifyStoreId);

      // Get current order to preserve existing tags
      const getResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/orders/${externalOrderId}.json`, { headers }),
      );

      const currentTags = getResponse.data.order.tags || '';
      const currentTagsArray = currentTags.split(',').map((t: string) => t.trim()).filter(Boolean);
      
      // Merge with new tags (deduplicate)
      const allTags = [...new Set([...currentTagsArray, ...tags])];

      // Update order with merged tags
      await firstValueFrom(
        this.httpService.put(
          `${baseUrl}/orders/${externalOrderId}.json`,
          {
            order: {
              id: parseInt(externalOrderId),
              tags: allTags.join(', '),
            },
          },
          { headers },
        ),
      );

      this.logger.log(`Added tags to Shopify order ${externalOrderId}: ${tags.join(', ')}`);
    } catch (error) {
      this.logger.error(
        `Failed to add tags to Shopify order ${externalOrderId}: ${error.message}`,
        error.response?.data ? JSON.stringify(error.response.data) : error.stack,
      );
      // Don't throw - sync failure shouldn't block confirmation
    }
  }

  /**
   * Cancel order in Shopify
   * Used when customer cancels via WhatsApp
   */
  async cancelShopifyOrder(
    shopifyStoreId: string,
    externalOrderId: string,
    reason: string,
    note?: string,
  ): Promise<void> {
    try {
      const { baseUrl, headers } = await this.getShopifyClient(shopifyStoreId);

      // Check if order can be cancelled
      const orderResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/orders/${externalOrderId}.json`, { headers }),
      );

      const order = orderResponse.data.order;
      
      if (order.cancelled_at) {
        this.logger.warn(`Order ${externalOrderId} is already cancelled`);
        return;
      }

      if (order.fulfillment_status === 'fulfilled') {
        this.logger.warn(`Order ${externalOrderId} is already fulfilled, cannot cancel`);
        return;
      }

      // Cancel the order
      await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/orders/${externalOrderId}/cancel.json`,
          {
            reason: reason, // 'customer', 'inventory', 'fraud', 'declined', 'other'
            email: false, // Don't send Shopify cancellation email (we handle via WhatsApp)
            refund: order.financial_status === 'paid', // Only refund if paid
          },
          { headers },
        ),
      );

      // Add cancellation note if provided
      if (note) {
        await this.addOrderNote(shopifyStoreId, externalOrderId, note);
      }

      this.logger.log(`Cancelled Shopify order ${externalOrderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel Shopify order ${externalOrderId}: ${error.message}`,
        error.response?.data ? JSON.stringify(error.response.data) : error.stack,
      );
      // Don't throw - sync failure shouldn't block cancellation in CRM
    }
  }

  /**
   * Create fulfillment for order (mark as ready to ship)
   * Used for COD orders after customer confirmation
   */
  async createFulfillment(
    shopifyStoreId: string,
    externalOrderId: string,
  ): Promise<void> {
    try {
      const { baseUrl, headers, store } = await this.getShopifyClient(shopifyStoreId);

      // Get order details to get line items
      const orderResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/orders/${externalOrderId}.json`, { headers }),
      );

      const order = orderResponse.data.order;
      
      // Check if already fulfilled
      if (order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partial') {
        this.logger.warn(`Order ${externalOrderId} already has fulfillment status: ${order.fulfillment_status}`);
        return;
      }

      const lineItems = order.line_items.map((item: any) => ({
        id: item.id,
        quantity: item.fulfillable_quantity || item.quantity,
      })).filter((item: any) => item.quantity > 0);

      if (lineItems.length === 0) {
        this.logger.warn(`No fulfillable items for order ${externalOrderId}`);
        return;
      }

      // Create fulfillment
      await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/fulfillments.json`,
          {
            fulfillment: {
              line_items_by_fulfillment_order: [{
                fulfillment_order_id: order.id,
              }],
              tracking_info: {
                company: 'Manual',
              },
              notify_customer: false, // We send WhatsApp notification instead
            },
          },
          { headers },
        ),
      );

      this.logger.log(`Created fulfillment for Shopify order ${externalOrderId}`);
    } catch (error) {
      const errorMsg = error.response?.data?.errors || error.message;
      
      if (error.response?.status === 403) {
        this.logger.warn(
          `Skipping fulfillment for ${externalOrderId}: App needs 'write_fulfillments' permission. ` +
          `Go to Shopify Partners → Your App → Configuration → Add 'write_fulfillments' scope.`
        );
      } else {
        this.logger.error(
          `Failed to create fulfillment for ${externalOrderId}: ${errorMsg}`,
          error.response?.data ? JSON.stringify(error.response.data) : error.stack,
        );
      }
      // Don't throw - fulfillment can be created manually later
    }
  }

  /**
   * Update order financial status in Shopify
   * Used for marking COD orders as paid after delivery
   */
  async updateFinancialStatus(
    shopifyStoreId: string,
    externalOrderId: string,
    status: 'paid' | 'pending' | 'refunded' | 'voided',
  ): Promise<void> {
    try {
      const { baseUrl, headers } = await this.getShopifyClient(shopifyStoreId);

      await firstValueFrom(
        this.httpService.put(
          `${baseUrl}/orders/${externalOrderId}.json`,
          {
            order: {
              id: externalOrderId,
              financial_status: status,
            },
          },
          { headers },
        ),
      );

      this.logger.log(`Updated financial status for order ${externalOrderId} to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update financial status: ${error.message}`);
    }
  }
}

