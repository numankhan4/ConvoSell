# WhatsApp Meta Cloud API Setup Guide
**ConvoSell CRM - Complete WhatsApp Integration**

---

## ⚠️ IMPORTANT: Webhook Configuration

**Correct Webhook Endpoint Path:** `/api/whatsapp/webhook`

Your complete webhook URL should be:
- **Production:** `https://your-domain.com/api/whatsapp/webhook`
- **Local Development (ngrok):** `https://YOUR-NGROK-ID.ngrok-free.app/api/whatsapp/webhook`
- **Verify Token:** Must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in backend `.env` file

> 🔴 **Common Mistake:** Do NOT use `/api/webhooks/whatsapp` (incorrect path)
> 
> ✅ **Correct:** `/api/whatsapp/webhook`

---

## 📋 Your WhatsApp Credentials

### ✅ Meta App Configuration
- **App Name**: ConvoSell CRM
- **App ID**: (Found in developers.facebook.com/apps)
- **Business Portfolio**: ConvoSell

### 🔑 API Credentials (SAVE THESE SECURELY)

```
Phone Number ID: YOUR_PHONE_NUMBER_ID
WhatsApp Business Account ID: YOUR_BUSINESS_ACCOUNT_ID
Access Token (System User - Never Expires): 
[REDACTED - Keep this token private and secure]

Test Phone Number: +1 555 186 5742
Token Type: system-user (permanent, no expiry)
```

> **🔒 SECURITY WARNING:**  
> Never commit your access token to version control or share it publicly.  
> Store it securely in environment variables or a secrets manager.  
> If exposed, immediately regenerate it in Meta Business Settings.

### 🔐 Permissions Granted
- ✅ `whatsapp_business_management` - Manage WhatsApp Business Account
- ✅ `whatsapp_business_messaging` - Send and receive messages

---

## 🚀 Part 1: Admin Setup (One-Time Configuration)

### Step 1: Configure WhatsApp in Your CRM

1. **Navigate to Settings**
   - Open your CRM: `http://localhost:3004/dashboard/settings`
   - Click on the **WhatsApp** tab

2. **Add WhatsApp Integration**
   - Click **"Add WhatsApp Integration"** or **"Connect WhatsApp"**

3. **Enter Credentials**
   ```
   Integration Name: ConvoSell WhatsApp
   Phone Number ID: YOUR_PHONE_NUMBER_ID
   Business Account ID: YOUR_BUSINESS_ACCOUNT_ID
   Access Token: YOUR_SYSTEM_USER_ACCESS_TOKEN
   Token Type: system-user
   ```

4. **Save Configuration**
   - Click **Save** or **Connect**
   - System will validate the token and show connection status

### Step 2: Test Connection (Admin)

1. **Health Check**
   - After saving, look for **"Test Connection"** or **"Health Check"** button
   - Click it to verify the token is valid
   - Should show: ✅ **Healthy** status

2. **API Test Endpoints** (Optional - Backend Testing)
   ```bash
   # Get health summary
   GET http://localhost:3000/api/settings/whatsapp/health-summary
   
   # Manual health check for specific integration
   POST http://localhost:3000/api/settings/whatsapp/{integrationId}/health-check
   
   # Trigger manual token refresh check
   POST http://localhost:3000/api/settings/whatsapp/auto-refresh
   ```

### Step 3: Configure Webhooks (For Receiving Messages)

1. **Get Your Webhook URL**
   - Your ngrok URL: `https://YOUR_NGROK_URL`
   - Webhook endpoint: `https://YOUR_NGROK_URL/api/whatsapp/webhook`

2. **Configure in Meta Developer App**
   - Go to: https://developers.facebook.com/apps
   - Select: **ConvoSell CRM**
   - Click: **Use cases** → **Customize** (WhatsApp)
   - Click: **Configuration** in left sidebar
   - Find: **Webhooks** section
   - Click: **Configure webhooks** or **Edit**

3. **Webhook Configuration**
   ```
   Callback URL: https://YOUR_NGROK_URL/api/whatsapp/webhook
   Verify Token: (Your backend verification token - check backend .env file: WHATSAPP_WEBHOOK_VERIFY_TOKEN)
   ```

4. **Subscribe to Webhook Fields**
   
   **REQUIRED (Must Subscribe):**
   - ✅ `messages` - **CRITICAL** - Incoming customer messages, delivery/read receipts
     - This single field handles both incoming messages AND message statuses
     - Without this, your Inbox will be empty!
   
   **OPTIONAL (Available Later):**
   - ⚪ `account_alerts` - Important account notifications
   - ⚪ `message_template_status_update` - Template approval/rejection notifications
   - ⚪ `phone_number_quality_update` - Phone number quality rating changes
   
   **NOT AVAILABLE (Requires Special Permissions):**
   - ❌ `messaging_handovers` - Requires WhatsApp Platform Partner status
     - You'll get "Failed to subscribe" error if you try
     - Skip this field - not needed for core functionality
   
   **Quick Start:** Subscribe to `messages` only. Click **Subscribe** button.

### Step 4: Test Sending First Message

1. **Using Test Number**
   - Test number: `+1 555 186 5742`
   - You can send messages TO this number from your CRM
   - Receive messages FROM this number to test incoming webhooks

2. **Send Test Message from CRM**
   - Navigate to **Inbox** or **Contacts**
   - Select a contact or create new one
   - Send a test message
   - Check status: Should show "Sent" → "Delivered" → "Read"

---

## 👥 Part 2: End User Setup (Customer Side)

### For Your Customers to Receive Messages:

**Option 1: Using Meta Test Number (Development Only)**
- Customers can send messages to: `+1 555 186 5742`
- This is Meta's free test number
- Limited to 5 recipient numbers
- Only for testing, not production use

**Option 2: Add Real Business Phone Number (Production)**

1. **Navigate to WhatsApp Manager**
   - Go to: https://business.facebook.com/wa/manage/home/
   - Or: Meta Developer App → Use cases → WhatsApp → API Setup

2. **Add Phone Number**
   - Click: **Add phone number**
   - Choose: **Register phone number** (your business number)
   - Follow verification steps (SMS code)

3. **Verify Phone Number**
   - Enter verification code received via SMS
   - Complete business verification if required
   - Number will be ready to use in 5-10 minutes

4. **Update CRM Configuration**
   - Copy new **Phone Number ID** from Meta dashboard
   - Update in CRM Settings → WhatsApp → Edit Integration
   - Replace test number ID with production number ID

### For End Users (Customers):
- **No setup required!** ✅
- Customers just save your business WhatsApp number
- They send messages normally through WhatsApp app
- Messages appear in your CRM inbox automatically

---

## 🔄 Part 3: Auto-Refresh System (Already Implemented)

Your CRM has an **automatic token health monitoring system** built-in:

### Features:
- ✅ **Daily Health Checks** - Runs every 24 hours automatically
- ✅ **Auto-Refresh** - Tokens expiring in < 7 days are refreshed automatically
- ✅ **Health Status Tracking** - 4 states: healthy, warning, error, unknown
- ✅ **System User Tokens** - Your token is permanent (never expires!)

### How It Works:
```
Backend Service: WhatsAppCronService
├── Starts automatically on server launch
├── Checks every 24 hours
├── Validates token with Meta API
└── Updates health status in database
```

### Monitoring:
- **Dashboard**: Check token health in Settings → WhatsApp
- **Status Indicators**:
  - 🟢 **Healthy**: Token valid, no issues
  - 🟡 **Warning**: Token expiring soon (< 7 days)
  - 🔴 **Error**: Token invalid or expired
  - ⚪ **Unknown**: Not yet checked

---

## 🆘 Part 4: Troubleshooting Guide

### Problem 1: "Invalid Access Token" Error

**Solution:**
1. Check token is copied correctly (no extra spaces)
2. Verify token hasn't been revoked in Business Settings
3. Ensure System User has proper permissions
4. Go to Business Settings → System Users → ConvoSell App → Verify assets assigned

### Problem 2: "Phone Number Not Found"

**Solution:**
1. Verify Phone Number ID is correct: `YOUR_PHONE_NUMBER_ID`
2. Check phone number is registered in WhatsApp Manager
3. Ensure System User has access to WhatsApp account
4. Wait 5-10 minutes after adding new phone number

### Problem 3: Messages Not Sending

**Solution:**
1. Check token health in CRM dashboard
2. Verify recipient has WhatsApp account
3. Check recipient number format: `+1234567890` (with country code, no spaces)
4. Review backend logs for error messages
5. Test with API directly:
   ```bash
   curl -X POST https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "messaging_product": "whatsapp",
       "to": "+1234567890",
       "type": "text",
       "text": {"body": "Test message"}
     }'
   ```

### Problem 4: Webhooks Not Receiving Messages

**Solution:**
1. Verify ngrok is running: `https://YOUR_NGROK_URL`
2. Check webhook configuration in Meta app
3. Verify webhook subscriptions are active
4. Test webhook endpoint:
   ```bash
   curl -X GET "https://YOUR_NGROK_URL/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=TEST"
   ```
5. Check backend logs for webhook events

### Problem 5: "Rate Limit Exceeded"

**Solution:**
- Test number limited to 5 recipients
- Messaging limits: 1000 messages/24h (verified business)
- Wait 24 hours or verify business for higher limits
- Check Meta Business verification status

---

## 📊 Part 5: Production Checklist

### Before Going Live:

- [ ] Replace test phone number with real business number
- [ ] Complete Meta Business Verification
- [ ] Configure permanent webhook URL (not ngrok)
- [ ] Set up SSL certificate for webhook endpoint
- [ ] Test message delivery with real customers
- [ ] Monitor health status for 48 hours
- [ ] Set up alerting for token health issues
- [ ] Train team on CRM inbox features
- [ ] Create message templates for common responses
- [ ] Configure auto-replies and business hours

### Business Verification Requirements:
1. Business name matches legal documents
2. Business address verified
3. Business phone number verified
4. Business email verified
5. Business website (optional but recommended)
6. Business documents uploaded (registration, tax ID)

**Verification Time**: 1-5 business days

---

## 🔗 Important Links

### Meta Resources:
- **Developer App Dashboard**: https://developers.facebook.com/apps
- **Business Settings**: https://business.facebook.com/settings/system-users
- **WhatsApp Manager**: https://business.facebook.com/wa/manage/home/
- **API Documentation**: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- **WhatsApp Business Platform Docs**: https://developers.facebook.com/docs/whatsapp

### Your CRM Endpoints:
- **Frontend Dashboard**: http://localhost:3004/dashboard
- **Settings**: http://localhost:3004/dashboard/settings
- **Backend API**: http://localhost:3000/api
- **Public Webhook**: https://YOUR_NGROK_URL/api/whatsapp/webhook

---

## 📱 Quick Reference Card

**Copy this for easy access:**

```
=== WhatsApp Integration Quick Reference ===

Phone Number ID: YOUR_PHONE_NUMBER_ID
Business Account ID: YOUR_BUSINESS_ACCOUNT_ID
Test Number: +1 555 186 5742

Access Token (System User):
[REPLACE WITH YOUR ACTUAL TOKEN FROM META]

Meta App: ConvoSell CRM
Business Portfolio: ConvoSell
System User: ConvoSell App (ID: 6157329665200)

Token Type: system-user (permanent)
Auto-Refresh: Enabled (daily checks)
Health Status: Check in CRM Settings → WhatsApp

=== Security Reminder ===
🔒 NEVER commit your access token to Git
🔒 Store tokens in .env files (add to .gitignore)
🔒 Use environment variables in production
🔒 Regenerate immediately if token is exposed

=== Support ===
Meta Status: https://metastatus.com/whatsapp-business-api
Meta Support: https://developers.facebook.com/support/
```

---

## ✅ Next Steps

1. **Configure in CRM** (5 minutes)
   - Open Settings → WhatsApp
   - Enter credentials above
   - Click Save and Test Connection

2. **Set Up Webhooks** (10 minutes)
   - Go to Meta Developer App
   - Configure webhook URL
   - Subscribe to message events

3. **Test End-to-End** (5 minutes)
   - Send test message from CRM
   - Verify delivery status
   - Reply from WhatsApp app
   - Check message appears in CRM inbox

4. **Monitor Health** (Ongoing)
   - Check daily for 1 week
   - Verify auto-refresh is working
   - Ensure no token errors

5. **Plan Production Migration** (When ready)
   - Add real business phone number
   - Complete business verification
   - Update webhook to permanent domain
   - Train team on CRM features

---

**Document Version**: 1.0  
**Last Updated**: April 5, 2026  
**Status**: ✅ Ready to Configure

**Need Help?** Check the Troubleshooting section or review Meta's official documentation.
