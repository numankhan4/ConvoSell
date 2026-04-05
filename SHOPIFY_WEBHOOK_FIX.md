# Fix: Shopify Orders Not Syncing - Webhook URL Mismatch

## Problem
Created an order in Shopify but it didn't appear in the CRM orders page and automations didn't trigger.

## Root Cause
The webhook URLs shown in settings were incorrect:
- **Old (Wrong)**: `/api/webhooks/shopify/orders/create`
- **Actual Endpoint**: `/api/shopify/webhook`

Shopify was sending webhooks to the wrong URL, so orders weren't being created in the database.

## What Was Fixed

### 1. Backend Webhook URL Documentation
**File**: `backend/src/settings/settings.service.ts`

Updated the `getWebhookUrls()` method to show the correct single webhook endpoint:
```typescript
shopify: {
  callbackUrl: `${apiUrl}/api/shopify/webhook`,
  // ... instructions updated
}
```

### 2. Created Diagnostic Script
**File**: `backend/src/scripts/check-shopify-webhooks.ts`

New script to check webhook configuration and identify issues.

## How to Fix Your Setup

### Step 1: Check Current Webhook Status

Run the diagnostic script:
```bash
cd backend
npx ts-node src/scripts/check-shopify-webhooks.ts
```

This will show:
- ✅ What webhooks are currently registered
- ❌ Which have incorrect URLs
- 💡 What action to take

### Step 2: Re-register Webhooks (Option A - Automatic)

1. Go to Settings → Shopify tab in your CRM
2. Click the **"Register Webhooks"** button
3. This will automatically create/update webhooks with the correct URL

### Step 2: Manual Registration (Option B - Manual)

If automatic registration doesn't work:

1. **Delete old webhooks** (in Shopify Admin):
   - Go to Settings → Notifications
   - Scroll to "Webhooks" section
   - Delete any webhooks with wrong URLs

2. **Create new webhooks**:
   - Click "Create webhook"
   - Event: **Order creation**
   - Format: **JSON**
   - URL: `https://your-ngrok-url.ngrok-free.app/api/shopify/webhook`
   - Click "Save webhook"
   
3. **Repeat for other events**:
   - Event: **Order updated** → Same URL
   - Event: **Order cancelled** (optional) → Same URL

### Step 3: Test Webhook

1. Create a test order in your Shopify store
2. Check backend console logs - you should see:
   ```
   🔔 ========================================
   📥 SHOPIFY WEBHOOK RECEIVED
      Topic: orders/create
      Shop: your-store.myshopify.com
      Order ID: 1234567890
   ========================================
   ```

3. Check orders page in CRM - order should appear
4. Check automations - they should trigger if configured

## Current Webhook Architecture

**Single Endpoint for All Events:**
- URL: `/api/shopify/webhook`
- Handles all order events (create, update, cancel, fulfilled)
- Event type determined by `x-shopify-topic` header

**Why this works better:**
- ✅ One URL to manage instead of multiple
- ✅ Easier to update (change once, affects all events)
- ✅ Standard Shopify best practice
- ✅ Automatic webhook registration works correctly

## Webhook Event Flow

```
1. Order created in Shopify
   ↓
2. Shopify sends POST to /api/shopify/webhook
   Headers:
   - x-shopify-topic: orders/create
   - x-shopify-shop-domain: your-store.myshopify.com
   - x-shopify-hmac-sha256: {signature}
   ↓
3. ShopifyController receives webhook
   - Finds workspace by shop domain
   - Routes to appropriate handler based on topic
   ↓
4. ShopifyService.handleOrderCreated()
   - Creates or updates contact
   - Creates order in database
   - Links order to contact
   ↓
5. AutomationsService (if configured)
   - Checks for "order_created" trigger
   - Executes automation actions
   - Sends WhatsApp messages
```

## What Gets Created When Order Webhook Fires

**1. Contact** (if doesn't exist):
```typescript
{
  name: customer.first_name + customer.last_name,
  phone: customer.phone,
  email: customer.email,
  source: 'shopify',
  shopifyCustomerId: customer.id
}
```

**2. Order**:
```typescript
{
  externalOrderId: order.id.toString(),
  externalOrderNumber: order.order_number,
  status: 'pending',
  totalAmount: order.total_price,
  currency: order.currency,
  items: order.line_items,
  shippingAddress: order.shipping_address,
  // ... more fields
}
```

**3. Automation Trigger** (if configured):
- Checks for automations with `trigger: "order_created"`
- Executes actions (send WhatsApp message, etc.)

## Verify Webhook URL

### Get Your Webhook URL

**If using ngrok:**
```bash
# Your ngrok URL from the ngrok terminal
https://abc123.ngrok-free.app/api/shopify/webhook
```

**If deployed:**
```bash
# Your production domain
https://app.convosell.com/api/shopify/webhook
```

### Environment Variable

Set in `.env`:
```env
APP_URL=https://your-ngrok-url.ngrok-free.app
# or
APP_URL=https://app.convosell.com
```

The backend will automatically use this to construct webhook URLs.

## Troubleshooting

### Issue: Diagnostic script shows "No access token"
**Fix**: Complete OAuth connection in Settings → Shopify

### Issue: Diagnostic script shows "No webhooks registered" 
**Fix**: Click "Register Webhooks" button in Settings

### Issue: Webhooks registered but orders still not appearing
**Check**:
1. Backend console for webhook received logs
2. Any error messages in console
3. Database: `SELECT * FROM orders;`
4. Verify shop domain matches exactly

### Issue: "Store not found" in webhook logs
**Fix**: Ensure shop domain in webhook matches exactly:
- Webhook: `your-store.myshopify.com`
- Database: `your-store.myshopify.com`
(must be identical, case-sensitive)

### Issue: Automations not triggering
**Check**:
1. Automation is active (`isActive: true`)
2. Trigger is `"order_created"`
3. WhatsApp integration is connected
4. Check automation logs in backend console

## Testing Checklist

After fixing webhooks:

- [ ] Run diagnostic script - all webhooks show ✅
- [ ] Create test order in Shopify
- [ ] See webhook received log in backend console
- [ ] Order appears in CRM orders page
- [ ] Contact created/updated automatically
- [ ] Automation triggers (if configured)
- [ ] WhatsApp message sent (if automation configured)

## Next Steps

1. **Run diagnostic script** to identify current issues
2. **Re-register webhooks** using "Register Webhooks" button
3. **Create test order** in Shopify to verify
4. **Check logs and database** to confirm everything works

## Support

If issues persist after following this guide:
1. Share output from diagnostic script
2. Share backend console logs when creating order
3. Share screenshot of Shopify webhook settings

---

**Status**: Backend fixed, webhooks need re-registration
