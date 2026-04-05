# Shopify Webhook Quick Test

## Step 1: Find Your ngrok URL

Look at your ngrok terminal window. You should see something like:

```
Forwarding    https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

Copy the URL (the `https://abc123-def456.ngrok-free.app` part)

## Step 2: Check Your Shop Domain

Run this command:

```powershell
cd backend
npx ts-node src/scripts/check-shopify-store.ts
```

This will show your shop domain (e.g., `your-store.myshopify.com`)

## Step 3: Test Webhook Endpoint

Replace `YOUR-NGROK-URL` with your actual ngrok URL from Step 1:

```powershell
# Example (replace with YOUR actual URL):
curl -X POST https://abc123-def456.ngrok-free.app/api/shopify/webhook/test -H "Content-Type: application/json" -d '{\"test\":\"data\"}'
```

Or use PowerShell's Invoke-RestMethod:

```powershell
$ngrokUrl = "https://abc123-def456.ngrok-free.app"  # Replace with YOUR URL
Invoke-RestMethod -Method Post -Uri "$ngrokUrl/api/shopify/webhook/test" -ContentType "application/json" -Body '{"test":"data"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Webhook endpoint is working!",
  "received": {
    "test": "data"
  },
  "timestamp": "2026-04-05T..."
}
```

**Expected Backend Console Log:**
```
✅ ========================================
🧪 TEST WEBHOOK RECEIVED
   Body: {
  "test": "data"
}
========================================
```

## Step 4: Configure Shopify Webhook

Once you confirm the test endpoint works:

1. Go to Shopify Admin → Settings → Notifications
2. Scroll to "Webhooks"
3. Click "Create webhook"
4. Fill in:
   - **Event**: Order creation
   - **Format**: JSON
   - **URL**: `https://YOUR-NGROK-URL.ngrok-free.app/api/shopify/webhook`
     (Use your actual ngrok URL from Step 1)
5. Click "Save webhook"

## Step 5: Test with Real Order

1. In Shopify Admin, create a test order
2. Watch your backend console for:

```
🔔 ========================================
📥 SHOPIFY WEBHOOK RECEIVED
   Topic: orders/create
   Shop: your-store.myshopify.com
   Order ID: 1234567890
   Order Number: #1001
========================================
```

3. Check CRM Orders page - order should appear!

## Troubleshooting

### Error: "The endpoint ... is offline"

This means your ngrok URL is wrong or ngrok is not running.

**Fix:**
1. Make sure ngrok terminal is running
2. Copy the EXACT URL from ngrok terminal
3. Don't include "YOUR-NGROK-URL" literally - replace it!

### Error: Still no webhook logs

**Reasons:**
1. Webhook not created in Shopify
2. Webhook URL is different from your ngrok URL
3. Shop domain in webhook doesn't match database

**Fix:**
- Run `npx ts-node src/scripts/check-shopify-store.ts` to see correct domain
- Verify webhook URL in Shopify matches ngrok URL exactly
- Click "Send test notification" in Shopify webhook settings

## Quick Commands Reference

```powershell
# Step 1: Check shop domain
cd backend
npx ts-node src/scripts/check-shopify-store.ts

# Step 2: Set your ngrok URL (replace with actual URL)
$ngrokUrl = "https://YOUR-NGROK-URL.ngrok-free.app"

# Step 3: Test endpoint
Invoke-RestMethod -Method Post -Uri "$ngrokUrl/api/shopify/webhook/test" -ContentType "application/json" -Body '{"test":"data"}'

# Step 4: Your webhook URL for Shopify
Write-Host "Webhook URL: $ngrokUrl/api/shopify/webhook"
```

## Need Your Actual ngrok URL?

If you can't find your ngrok terminal, check:
1. Task bar for running terminals
2. Or restart ngrok: `npm run start:windows` in project root
3. URL will be displayed when ngrok starts
