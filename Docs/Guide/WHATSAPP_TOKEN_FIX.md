# WhatsApp Access Token Expired - Fix Guide

## Problem Summary
Your WhatsApp access token expired on **March 31, 2026 at 1:00 PM PDT**.

This is why:
- ✅ Automations ARE triggering (outbox events created & processed)
- ✅ Worker IS running correctly (processes events in ~3 seconds)
- ❌ WhatsApp messages FAIL (expired token)
- ❌ Manual verification also fails (same expired token)

## Solution: Update Access Token

### Step 1: Get New Access Token from Meta

1. Go to **Meta Business Manager** (business.facebook.com)
2. Navigate to **WhatsApp API** settings
3. Click on your **Phone Number**
4. Find **"Generate Access Token"** or **"Refresh Token"**
5. Select permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
6. **Copy the new access token** (it will look like: `EAAxxxxxxxxxxxx...`)

### Step 2: Update in Your CRM

1. Open your CRM dashboard: http://localhost:3004/dashboard/settings
2. Click the **WhatsApp** tab
3. Paste the **new access token** in the "Access Token" field
4. Click **"Save Changes"** or **"Update"**
5. You should see: ✅ "WhatsApp integration updated successfully!"

### Step 3: Test the Fix

#### Option A: Create a Test Order
1. Create a new test order from Shopify
2. Wait 5-10 seconds
3. Check if the confirmation message is sent

#### Option B: Use Manual Verification
1. Go to **Orders** page
2. Find an order with status "Pending"
3. Click the **"⚡ Verify"** button
4. Message should be sent successfully

---

## Verification Script

Run this to verify the fix works:

```bash
cd backend
node check-orders.js
```

After updating the token, you should see `confirmationSentAt` timestamps for new orders.

---

## What Was Already Fixed

I've already fixed the button response handling, so now when customers click:
- ✅ "Confirm Order" → Order status automatically changes to "confirmed"
- ✅ "Cancel Order" → Order status automatically changes to "cancelled"

The 2 previously confirmed orders have been corrected in the database:
- Order #1007 ✅ Confirmed
- Order #1008 ✅ Confirmed

---

## Token Expiration

**Important:** Meta access tokens expire periodically. You have a few options:

### Short-lived tokens (current)
- Expire after 24-90 days
- Need manual refresh

### System User tokens (recommended)
- Create a **System User** in Meta Business Settings
- Generate a token with "Never expires" option
- More stable for production

### Refresh token flow (advanced)
- Implement automatic token refresh
- Requires storing refresh tokens
- Renews tokens automatically before expiry

---

## Quick Reference

| Setting | Example Value |
|---------|---------------|
| Phone Number ID | `123456789012345` |
| Phone Number | `+92xxxxxxxxxx` |
| Business Account ID | `987654321098765` |
| Access Token | `EAAxxxxx...` (long string) |
| Webhook Token | (your secret) |

---

## Need Help?

If the token update doesn't work:
1. Verify the token has the right permissions
2. Check that the phone number ID matches
3. Ensure the business account ID is correct
4. Look at backend logs for detailed error messages

Run `cd backend && npm run start:dev` and watch for any new errors.
