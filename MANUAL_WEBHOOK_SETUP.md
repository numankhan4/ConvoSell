# Manual Webhook Setup - Step by Step Guide

## Good News!

Manual webhook creation in **Settings → Notifications → Webhooks** bypasses the protected customer data approval requirement. This will work immediately!

---

## Step-by-Step Instructions

You need to create **3 webhooks** (one for each order event).

### Webhook #1: Order Creation

1. **Click "Create webhook"** button
2. Fill in the form:
   - **Event**: Select `ORDERS_CREATE` (shows as "Order creation" in dropdown)
   - **Format**: `JSON`
   - **URL**: `https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook`
   - **Webhook API version**: Select latest version (2024-10 or whatever is shown)
3. **Click "Save"**

### Webhook #2: Order Update

1. **Click "Create webhook"** button again
2. Fill in the form:
   - **Event**: Select `ORDERS_UPDATED` (shows as "Order update" in dropdown)
   - **Format**: `JSON`
   - **URL**: `https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook`
   - **Webhook API version**: Same as above
3. **Click "Save"**

### Webhook #3: Order Cancellation (Optional but Recommended)

1. **Click "Create webhook"** button again
2. Fill in the form:
   - **Event**: Select `ORDERS_CANCELLED` (shows as "Order cancellation" in dropdown)
   - **Format**: `JSON`
   - **URL**: `https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook`
   - **Webhook API version**: Same as above
3. **Click "Save"**

---

## Important Notes

### URL to Use
```
https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook
```

**Use the SAME URL for all three webhooks** - your backend automatically handles different event types.

### Event Names
When filling out the form, look for these exact values in the dropdown:
- **ORDERS_CREATE** - Listed as "Order creation"
- **ORDERS_UPDATED** - Listed as "Order update"  
- **ORDERS_CANCELLED** - Listed as "Order cancellation"

### Format
Always select **JSON** (not XML)

### API Version
Use the latest version available in the dropdown (likely 2024-10 or 2025-01)

---

## After Creating Webhooks

### Verify Webhooks Were Created

After creating all 3 webhooks, you should see them listed on the Webhooks page:

```
✅ Order creation → https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook
✅ Order update → https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook
✅ Order cancellation → https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook
```

### Test with a New Order

1. **Go to Shopify Admin** → **Orders**
2. **Click "Create order"**
3. Fill in:
   - Customer: Create a test customer (or use existing)
   - Products: Add any product
   - Payment: Mark as paid
4. **Click "Save"**

### Check Backend Console

You should immediately see in your backend terminal:

```
🔔 SHOPIFY WEBHOOK RECEIVED
   Topic: orders/create
   Shop: convosell-dev.myshopify.com
   Order ID: 1001
   Order Number: #1001
   Timestamp: 2026-04-05T04:15:00.000Z

📝 Handling order creation...
✅ Order created successfully
```

### Check CRM

1. Go to your CRM → **Dashboard** → **Orders** (or Inbox)
2. The order should appear within 1-2 seconds
3. Customer contact should be created/updated automatically

---

## Troubleshooting

### If webhooks don't fire:

1. **Check ngrok is running**:
   - Your ngrok terminal should show "Session Status: online"
   - URL should be: `https://thriftless-nonviable-waylon.ngrok-free.dev`

2. **Check backend is running**:
   - You should see `[Nest] Application is running on: http://localhost:3000`

3. **Verify webhook URLs match**:
   - All 3 webhooks should point to the SAME URL
   - URL must include `/api/shopify/webhook` path

4. **Check Shopify webhook delivery**:
   - In Shopify, click on a webhook you created
   - Scroll down to see "Recent deliveries"
   - Click on a delivery to see response status
   - Should show: `200 OK` (success)

### If you see errors in webhook deliveries:

- **404 Not Found**: Backend isn't running or ngrok URL changed
- **500 Server Error**: Check backend console for error details
- **Timeout**: Backend is slow or unresponsive

---

## Advantages of Manual Setup

✅ **Works immediately** - No approval needed
✅ **More visible** - Easy to see and manage in Shopify Admin
✅ **Easy to debug** - Shopify shows delivery history and errors
✅ **Permanent** - Persists even if you restart backend

## Disadvantages

⚠️ **Manual process** - Have to create each webhook individually
⚠️ **If OAuth disconnects** - Need to recreate webhooks manually
⚠️ **If ngrok URL changes** - Need to update all 3 webhook URLs

---

## When to Use Automated Registration

The automated "Register Webhooks" button in your CRM is still useful for:
- **Production deployments** with permanent URLs (not ngrok)
- **Multiple stores** - one-click setup per store
- **OAuth reconnections** - automatically re-register webhooks

For development with ngrok, **manual setup is actually better** because you can easily verify and troubleshoot in Shopify Admin.

---

## Next Steps

1. ✅ Create the 3 webhooks (follow steps above)
2. ✅ Create a test order in Shopify
3. ✅ Verify it appears in your CRM
4. ✅ Check webhook delivery history in Shopify Admin
5. 🎉 Start using your CRM!

---

## Summary

You don't need the "protected customer data" approval for manual webhook creation. Just create 3 webhooks pointing to your ngrok URL, and orders will sync to your CRM in real-time!
