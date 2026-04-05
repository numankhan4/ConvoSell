# Shopify Orders Not Syncing - Step-by-Step Fix

## Quick Diagnostic Steps

### Step 1: Verify Your ngrok URL is Running

1. Check your ngrok terminal - you should see:
   ```
   Forwarding    https://xxxxx.ngrok-free.app -> http://localhost:3000
   ```

2. Copy your ngrok URL (e.g., `https://abc123.ngrok-free.app`)

3. **Test if backend is reachable** - Open in browser:
   ```
   https://your-ngrok-url.ngrok-free.app/api/shopify/webhook/test
   ```
   
   You should see: `Cannot POST /api/shopify/webhook/test` (this is OK - means the URL is reachable)

### Step 2: Test Webhook Endpoint

Open a new terminal and run this curl command (replace with YOUR ngrok URL):

```bash
curl -X POST https://your-ngrok-url.ngrok-free.app/api/shopify/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected result in backend console:**
```
✅ ========================================
🧪 TEST WEBHOOK RECEIVED
   Body: {
  "test": "data"
}
========================================
```

✅ If you see this log → Your backend is working!  
❌ If no log appears → Backend isn't receiving requests (check ngrok/firewall)

### Step 3: Check Shopify Store Domain in Database

Run this in backend folder:
```bash
cd backend
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.shopifyStore.findMany({ 
  where: { isActive: true },
  select: { shopDomain: true, workspaceId: true }
}).then(stores => {
  console.log('Active Shopify Stores:');
  stores.forEach(s => console.log('  Domain:', s.shopDomain));
  prisma.\$disconnect();
});
"
```

**Write down your shop domain** (e.g., `your-store.myshopify.com`)

### Step 4: Configure Shopify Webhooks

1. **Go to Shopify Admin** → Settings → Notifications
2. Scroll to "Webhooks" section
3. **Check existing webhooks:**
   - Are there any for "Order creation"?
   - What URL do they point to?

4. **Delete old/wrong webhooks**  
   If any webhook has wrong URL, delete it

5. **Create new webhook:**
   - Click "Create webhook"
   - Event: **Order creation**
   - Format: **JSON**
   - URL: `https://your-ngrok-url.ngrok-free.app/api/shopify/webhook`
   - Click "Save webhook"

6. **Test webhook:**
   - In Shopify webhooks page, find your webhook
   - Click "Send test notification"
   - Check backend console for webhook received log

### Step 5: Create Test Order

1. In Shopify Admin, go to Orders
2. Click "Create order"
3. Add a product
4. Add customer info (name, phone +923001234567, email)
5. Click "Create order"

**Watch backend console for:**
```
🔔 ========================================
📥 SHOPIFY WEBHOOK RECEIVED
   Topic: orders/create
   Shop: your-store.myshopify.com
   Order ID: 1234567890
   Order Number: #1001
========================================

🔍 Looking up store with domain: your-store.myshopify.com
✓ Found store: xxx
✓ Processing webhook for workspace: yyy
📝 Handling order creation...
✅ Order created successfully
✅ Webhook processed successfully
```

### Step 6: Verify Order in CRM

1. Refresh Orders page in CRM
2. You should see the new order
3. If order appears → ✅ SUCCESS!

## Common Issues and Fixes

### Issue: No webhook log appears when creating order

**Cause**: Webhook not configured or wrong URL

**Fix**:
1. Verify webhook exists in Shopify (Settings → Notifications)
2. Verify URL is `https://your-ngrok-url.ngrok-free.app/api/shopify/webhook`
3. Click "Send test notification" in Shopify webhook
4. Watch backend console - if nothing appears, URL is wrong

### Issue: Webhook received but "Store not found"

**Logs show:**
```
❌ Store not found: your-store.myshopify.com
```

**Cause**: Shop domain mismatch

**Fix**:
1. Check what domain is in the webhook: `Shop: xxxxx`
2. Check what's in your database (Step 3 above)
3. They must match EXACTLY
4. If different, update in database:
   ```bash
   cd backend
   npx prisma studio
   # Find ShopifyStore table
   # Update shopDomain to match
   ```

### Issue: Webhook received but "Missing x-shopify-topic header"

**Cause**: Not a real Shopify webhook (manual test?)

**Fix**: Create actual order in Shopify (not manual curl test)

### Issue: "Error processing webhook"

**Logs show error details** - share them for specific help

## Automated Webhook Registration

Instead of manual setup, use the "Register Webhooks" button:

1. Settings → Shopify tab
2. Ensure Shopify is connected (OAuth)
3. Click "Register Webhooks"
4. Check console for success/error logs

This automatically creates all required webhooks with correct URLs.

## What Happens When Order is Created?

```
1. You create order in Shopify
   ↓
2. Shopify sends POST to /api/shopify/webhook
   Headers: x-shopify-topic: orders/create
   Body: {order data}
   ↓
3. Backend receives webhook
   → Logs: "SHOPIFY WEBHOOK RECEIVED"
   ↓
4. Finds store by shop domain
   ↓
5. Calls handleOrderCreated()
   → Creates/updates contact
   → Creates order in database
   ↓
6. Order appears in CRM
   ↓
7. Automation triggers (if configured)
```

## Testing Checklist

- [ ] ngrok URL is accessible (test in browser)
- [ ] Test endpoint works (curl test shows log)
- [ ] Shop domain matches database exactly
- [ ] Webhook created in Shopify with correct URL
- [ ] Test notification shows webhook received log
- [ ] Create real order → webhook received log appears
- [ ] Order appears in CRM orders page

## Still Not Working?

**Collect this information:**

1. **ngrok URL**: `https://xxxxx.ngrok-free.app`
2. **Shop domain from database** (Step 3)
3. **Webhook URL in Shopify** (from Settings → Notifications)
4. **Backend console output** when creating order
5. **Any error messages**

Then we can diagnose the specific issue!

---

**Next Step**: Start with Step 1 and work through each step. The test endpoint (Step 2) will immediately tell you if your backend is reachable.
