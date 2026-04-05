# Webhook Persistence - You Don't Need to Add Them Each Time!

## Important Clarification

**You DO NOT need to create webhooks "each time"!**

Webhooks are a **one-time setup** that persists in Shopify. Once created, they continue working until you explicitly delete them or disconnect OAuth.

---

## When Webhooks Persist (No Need to Recreate)

✅ **Backend restarts** - Webhooks keep working
✅ **Frontend restarts** - Webhooks keep working  
✅ **Database restarts** - Webhooks keep working
✅ **Computer restarts** - Webhooks keep working
✅ **Tomorrow, next week, next month** - Webhooks keep working

**Why?** Because webhooks are stored in **Shopify's system**, not yours. They're independent subscription that Shopify uses to notify your app.

---

## When You Need to UPDATE Webhooks (URL Change)

⚠️ **ngrok URL changes** - Update webhook URLs

If you're using ngrok for development and your ngrok URL changes (e.g., after restarting ngrok or your session expires), you need to update the webhook URLs:

### How to Update Webhook URLs:

1. **Go to Shopify Admin**
   - Settings → Notifications → Webhooks

2. **Click on each webhook**
   - Click "Order creation" webhook
   - Update URL field with new ngrok URL
   - Click "Save"
   - Repeat for "Order update" and "Order cancellation"

### To avoid frequent URL changes:

**Use ngrok static domains** (paid feature):
```powershell
ngrok http 3000 --domain=your-static-domain.ngrok-free.app
```

**OR use a permanent domain** for production:
- Deploy to Heroku, Render, Vercel, etc.
- Use your own domain (e.g., `api.yourcrm.com`)
- Create webhooks once, never update again!

---

## When You Need to RECREATE Webhooks (OAuth Disconnect)

⚠️ **OAuth disconnected** - Recreate webhooks

If you disconnect OAuth in your CRM settings, manual webhooks may stop working (Shopify may clean up webhooks from uninstalled apps).

### Prevention:

Don't disconnect OAuth unless you're intentionally removing the integration. If you need to reconnect, you'll need to recreate webhooks.

---

## Development vs Production

### Development (Current Setup - ngrok)

**Webhook lifespan:**
- ✅ Persist across backend/frontend restarts
- ⚠️ Need URL update when ngrok URL changes
- ⚠️ ngrok URLs may expire after inactivity (free tier)

**Recommendation:**
- Create webhooks once at the start of your project
- Only update URLs when ngrok URL changes
- Consider ngrok paid plan for static domains

### Production (Future Deployment)

**Webhook lifespan:**
- ✅ Persist forever
- ✅ Never need to update (permanent URL)
- ✅ Automatic webhook registration via CRM UI works

**Setup:**
1. Deploy to production with permanent URL
2. Request Shopify protected data approval
3. Use "Register Webhooks" button in CRM (one-click)
4. Never touch again!

---

## Comparison: Manual vs Automated Webhooks

| Aspect | Manual (Current) | Automated (Future) |
|--------|------------------|-------------------|
| **Setup frequency** | Once (then only URL updates) | Once (after approval) |
| **Shopify approval needed** | ❌ No | ✅ Yes |
| **Best for** | Development, testing | Production |
| **Maintenance** | Update URL if ngrok changes | None (permanent URL) |
| **Visibility** | ✅ Visible in Shopify Admin | Hidden (API-managed) |
| **Debugging** | ✅ Easy (see delivery history) | Check logs |

---

## Your Current Situation

### What you did:
1. ✅ Created 3 manual webhooks in Shopify Admin
2. ✅ Webhooks are working (order synced successfully)

### What you DON'T need to do:
- ❌ Recreate webhooks every day
- ❌ Recreate webhooks when restarting backend
- ❌ Recreate webhooks for every test order

### What you MIGHT need to do:
- ⚠️ Update webhook URLs if ngrok URL changes
- ⚠️ Recreate webhooks if you disconnect OAuth
- ⚠️ Delete and recreate if switching from manual to automated

---

## How to Check If Webhooks Are Working

### Method 1: Shopify Admin
1. **Shopify Admin** → **Settings** → **Notifications** → **Webhooks**
2. You should see your 3 webhooks listed:
   - Order creation
   - Order update  
   - Order cancellation
3. **Click on any webhook** → Scroll to **"Recent deliveries"**
4. You should see delivery attempts with status:
   - ✅ **200 OK** - Working perfectly
   - ❌ **404 Not Found** - ngrok URL changed or backend not running
   - ❌ **502 Bad Gateway** - Backend crashed or unreachable

### Method 2: Backend Logs
Create a test order and watch your backend console:
```
🔔 SHOPIFY WEBHOOK RECEIVED
   Topic: orders/create
   Shop: convosell-dev.myshopify.com
   Order ID: #1002
✅ Order created successfully
```

No logs = Webhook not reaching backend (check URL or backend status)

---

## Future Improvements (For Production)

When you deploy to production:

1. **Deploy backend to permanent URL**:
   - Example: `https://api.yourcrm.com`

2. **Request Shopify protected data approval**:
   - Shopify Admin → Apps → Develop apps → Request access
   - For production stores: 2-3 day review
   - For dev stores: Instant approval

3. **Use automated webhook registration**:
   - CRM → Settings → Shopify → Click "Register Webhooks"
   - One-click setup
   - No manual configuration

4. **Benefits**:
   - ✅ Webhooks persist forever
   - ✅ No URL updates needed
   - ✅ Automatic re-registration if needed
   - ✅ Multi-store support (one click per store)

---

## Summary

**Current (Development):**
- ✅ Manual webhooks created once
- ✅ Persist across restarts
- ⚠️ Update URL if ngrok changes
- ✅ Working now!

**Don't worry about recreating webhooks constantly!** They're already set up and will keep working. You only need to touch them if your ngrok URL changes or you disconnect OAuth.

**The end user will NEVER see this complexity** because in production:
- Permanent URLs (no changes)
- Automated registration (one-click)
- No manual configuration required
