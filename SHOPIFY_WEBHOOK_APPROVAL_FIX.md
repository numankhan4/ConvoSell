# Shopify Webhook Approval Fix

## Issue

When attempting to register webhooks automatically via the GraphQL API, you receive this error:

```
This app is not approved to subscribe to webhook topics containing protected customer data.
```

## Root Cause

Shopify requires custom apps to request explicit approval before subscribing to webhooks **via the API** that contain **protected customer data**. Order webhooks contain customer information (name, email, address), so they fall under this restriction.

See: https://shopify.dev/docs/apps/launch/protected-customer-data

## Solution 1: Manual Webhook Creation (RECOMMENDED - WORKS IMMEDIATELY)

**Good news!** Manual webhook creation in Shopify Admin **bypasses the approval requirement** and works immediately.

### Quick Steps:

1. **Go to Shopify Admin**
   - Navigate to: **Settings** → **Notifications**
   - Scroll to **"Webhooks"** section
   - Click **"Create webhook"**

2. **Create 3 webhooks** (one for each event):

   **Webhook #1 - Order Creation:**
   - Event: `ORDERS_CREATE` (shown as "Order creation")
   - Format: `JSON`
   - URL: `https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook`
   - API version: Latest (2024-10 or whatever is available)
   - Click **"Save"**

   **Webhook #2 - Order Update:**
   - Event: `ORDERS_UPDATED` (shown as "Order update")
   - Format: `JSON`
   - URL: `https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook`
   - API version: Latest
   - Click **"Save"**

   **Webhook #3 - Order Cancellation:**
   - Event: `ORDERS_CANCELLED` (shown as "Order cancellation")
   - Format: `JSON`
   - URL: `https://thriftless-nonviable-waylon.ngrok-free.dev/api/shopify/webhook`
   - API version: Latest
   - Click **"Save"**

3. **Test it!**
   - Create a test order in Shopify Admin
   - Check your backend console for webhook logs
   - Order should appear in CRM within 1-2 seconds ✅

**See [MANUAL_WEBHOOK_SETUP.md](MANUAL_WEBHOOK_SETUP.md) for detailed step-by-step instructions with troubleshooting.**

---

## Solution 2: Request Protected Customer Data Access (For Public Apps)

### Steps:

1. **Go to Shopify Admin**
   - Navigate to: **Settings** → **Apps and sales channels**

2. **Open your custom app**
   - Click **Develop apps**
   - Find your CRM app (the one you created for OAuth)

3. **Request data access**
   - Click on your app name
   - Look for **"Request access to protected customer data"** section
   - Click **"Request access"**

4. **Fill out the request form**
   - **Why you need this data**: "This CRM app needs to sync customer orders in real-time to provide customer support and order management"
   - **How you'll use the data**: "Customer data from orders will be stored securely in our CRM database to enable our team to view order history and provide customer support"
   - **Data retention policy**: "Customer data is stored securely and deleted when the user disconnects the Shopify integration"

5. **Submit and wait for approval**
   - For development stores: Approval is **instant** (automatic)
   - For production stores: Shopify reviews within 2-3 business days

6. **After approval**
   - Go back to your CRM → Settings → Shopify Integration
   - Click **"Register Webhooks"** button
   - Webhooks will now register successfully! ✅

---

## Comparison: Manual vs Automated Webhooks

| Method | Setup Time | Approval Needed | Best For |
|--------|------------|-----------------|----------|
| **Manual (Solution 1)** | 2 minutes | ❌ No | Development, testing, ngrok URLs |
| **Automated (Solution 2)** | Instant (after approval) | ✅ Yes | Production, permanent URLs, multiple stores |

---

## Verification

After setting up webhooks (using Solution 1 or 2), test by:

1. **Create a test order** in Shopify Admin
2. **Check backend console** - you should see:
   ```
   🔔 SHOPIFY WEBHOOK RECEIVED
      Topic: orders/create
      Shop: your-store.myshopify.com
      Order ID: #1001
   ```
3. **Check CRM** - order should appear in the orders list

---

## Recommended Next Steps

For immediate development/testing:
1. ✅ Use Solution 1 (Manual webhook creation)
2. ✅ Create 3 webhooks in Shopify Admin (2 minutes)
3. ✅ Test with a new order
4. 🎉 Start building your CRM features!

For production deployment (later):
1. ✅ Request protected data access in Shopify app settings
2. ⏳ Wait for approval (instant for dev stores)
3. ✅ Use automated "Register Webhooks" button in CRM
4. ✅ Deploy to production with permanent URL

---

## FAQ

**Q: Why doesn't the automated webhook registration work?**
- A: Shopify's GraphQL Admin API requires approval to access protected customer data. Manual webhook creation bypasses this requirement.

**Q: Do I need to use manual webhooks forever?**
- A: No. Manual webhooks are perfect for development. For production, request approval and use automated registration.

**Q: What if my ngrok URL changes?**
- A: You'll need to update the URL in all 3 webhooks. Go to Settings → Notifications → Webhooks → Click each webhook → Update URL → Save.

**Q: Will my existing OAuth connection work?**
- A: Yes! OAuth access token remains valid. The approval only affects webhook API registration, not manual webhook creation.

**Q: Can I use both manual and automated webhooks?**
- A: You should only use one method to avoid duplicate webhook deliveries. Manual is better for development; automated is better for production.

**Q: Is this a limitation of the CRM app?**
- A: No, this is Shopify's security policy for all apps accessing customer data via API.

---

## Summary

The automated webhook registration feature in your CRM works correctly - the issue is that Shopify requires explicit approval before custom apps can subscribe to webhooks containing customer data. Request approval (instant for dev stores), then use the one-click "Register Webhooks" button in your CRM settings.
