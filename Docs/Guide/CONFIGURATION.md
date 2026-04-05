# Configuration Guide

## Overview
This guide explains how to configure WhatsApp Business API and Shopify integrations for your CRM workspace.

## WhatsApp Business API Configuration

### ⚠️ IMPORTANT: Webhook Configuration

**Correct Webhook Endpoint:** `/api/whatsapp/webhook`

When configuring webhooks in Meta, use:
- **Production:** `https://your-domain.com/api/whatsapp/webhook`
- **Local Dev (ngrok):** `https://YOUR-NGROK-ID.ngrok-free.app/api/whatsapp/webhook`

> 🔴 **Do NOT use:** `/api/webhooks/whatsapp` (incorrect)
> 
> ✅ **Use:** `/api/whatsapp/webhook`

### Prerequisites
- A Meta Business Account
- A verified WhatsApp Business Account
- A phone number registered with WhatsApp Business

### Step-by-Step Setup (Updated March 2026)

1. **Create a Meta Developer App with WhatsApp Use Case**
   - Go to [Meta App Dashboard](https://developers.facebook.com/apps)
   - If you don't have an app:
     - Click "Create App" and follow the prompts
     - Select **"Connect with customers through WhatsApp"** use case
     - Select an existing **Business Portfolio** or create a new one (required)
     - Complete app creation
   - If you already have an app:
     - Select your app from the dashboard
     - Click **"Add use cases"**
     - Select **"Connect with customers through WhatsApp"**

2. **Connect WhatsApp Business Account**
   - In your app, click **"Use cases"** (pencil icon) in the sidebar
   - Under "Connect with customers through WhatsApp", click **"Customize"**
   - In the **API Setup** section:
     - Select an existing WhatsApp Business Account **OR**
     - Click **"Create a WhatsApp Business Account"** and complete the business profile
   - Your **WhatsApp Business Account ID** will be displayed in the API Setup panel
   - **Save this ID** - you'll need it for configuration

3. **Get Test Phone Number ID (For Initial Testing)**
   - Still in the **API Setup** section
   - Click **"Start using the API"** button in the Quickstart area
   - You'll see a **Test Phone Number ID** (15-digit number)
   - This is a temporary test number provided by Meta
   - **Save this Phone Number ID** for testing

4. **Generate Permanent Access Token (Required for Production)**
   - Navigate to [Meta Business Settings](https://business.facebook.com/latest/settings)
   - Click **"System users"** in the left sidebar
   - Click the **"Add +"** button (upper-right corner)
   - Create a system user (give it a name like "WhatsApp CRM Integration")
   - Select the new system user you created
   - Click **"Assign Assets"**
   - Under your app: Toggle **"Manage app"** under "Full control"
   - Under WhatsApp account: Toggle **"Manage WhatsApp Business Accounts"** under "Full control"
   - Click **"Assign assets"**
   - Click **"Generate token"** button
   - Select your app from the dropdown
   - Add these permissions:
     - ✅ `business_management`
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
   - Click "Generate token"
   - **Copy and save this token securely** (starts with "EAAG...")
   - This token does NOT expire and works for production

5. **Create Webhook Verify Token**
   - Generate a random secure string (your choice)
   - Example: Use `openssl rand -hex 32` in terminal, or create manually like `mySecureToken123xyz`
   - **Save this token** - you'll use it in both Meta settings and CRM configuration

6. **Configure Webhook in Meta**
   - Back in your app, go to **Use cases** (pencil icon) → **Customize**
   - Scroll to **"Configuration"** section
   - Click **"Edit"** on Webhook
   
   **You'll see a form asking for:**
   
   **Callback URL:** 
   - **For Production:** `https://your-domain.com/api/whatsapp/webhook`
   - **For Local Testing:** You need to expose your local server using ngrok:
     ```bash
     # Install ngrok: https://ngrok.com/download
     ngrok http 3000
     
     # Copy the https URL (e.g., https://abc123.ngrok.io)
     # Your callback URL: https://abc123.ngrok.io/api/whatsapp/webhook
     ```
   - Paste your callback URL in the field
   
   **Verify Token:**
   - Enter the **same verify token** you created in step 5
   - This must match exactly what you'll enter in your CRM settings
   - Example: `mySecureToken123xyz` or output from `openssl rand -hex 32`
   
   - Click **"Verify and Save"**
   - Meta will send a GET request to your callback URL to verify it's working
   - If verification succeeds, you'll see a success message
   
   **Subscribe to Webhook Fields:**
   
   After verification, subscribe to this webhook field:
   
   **REQUIRED:**
   - ✅ `messages` - Incoming messages + delivery/read receipts (all-in-one field)
   
   **SKIP THESE (Not Available or Not Implemented):**
   - ❌ `messaging_handovers` - Requires Platform Partner status (will fail)
   - ⚪ `account_alerts` - Optional (not yet implemented in backend)
   - ⚪ `message_template_status_update` - Optional (not yet implemented)
   - ⚪ `phone_number_quality_update` - Optional (not yet implemented)
   
   Click **"Subscribe"** next to the `messages` field, then click **"Save"**
   
   **⚠️ Important - App Publishing:**
   - While your app is **unpublished**, webhooks only receive **test data**
   - Production messages (real customer messages) require **app publishing**
   - For development/testing, unpublished mode works fine
   - For production, follow Meta's app review process to publish your app

7. **Add Production Phone Number (Optional - After Testing)**
   - For production, you need to add your own business phone number
   - Go to **Use cases** → **Customize** → **Phone numbers** section
   - Click **"Add phone number"**
   - Follow Meta's verification process (may require business verification)
   - Once verified, you'll get a new **Phone Number ID** for production
   - Replace the test number ID with this production ID in your CRM settings

8. **Enter Configuration in CRM**
   - Log in to your CRM workspace
   - Navigate to **Dashboard** → **Settings** → **WhatsApp Business** tab
   - Fill in the credentials you collected:
     - **Phone Number ID**: From API Setup section (test or production)
     - **Phone Number**: Your WhatsApp number in E.164 format (e.g., +923001234567)
     - **Business Account ID**: From API Setup panel
     - **Access Token**: System User permanent token from Business Settings
     - **Webhook Verify Token**: The custom token you created
   - Click **"Connect WhatsApp Business"**
   - Wait for success confirmation

### Testing Your Integration
After configuration:
1. Send a test message from your CRM inbox
2. Verify it appears in WhatsApp on your test device
3. Reply from WhatsApp and check if it appears in CRM inbox
4. Check message status updates (sent → delivered → read)

### Important Notes

**Test vs Production Phone Numbers:**
- Meta provides a **test phone number** for development (limited to 5 test recipients)
- For production, you must add and verify your **own business phone number**
- Test numbers are free but restricted; production numbers may have costs

**Access Token Types:**
- **Temporary tokens** (from API Setup Quickstart): Expire in 24 hours, only for testing
- **System User tokens** (from Business Settings): Permanent, required for production
- Always use System User tokens in your CRM configuration

**App Publishing & Webhooks:**
- **Unpublished apps**: Webhooks only receive test data and messages from test numbers
- **Published apps**: Webhooks receive all production messages from real customers
- **Development phase**: Use unpublished mode with test numbers (no Meta review needed)
- **Production phase**: Submit app for Meta review and publish to handle real customers

**Business Verification:**
- For sending messages to customers (not just test numbers), Meta requires business verification
- This process can take several days
- Start verification early if planning production use

**Local Development with Webhooks:**
- Your local server (localhost:3000) is not accessible from Meta's servers
- Use **ngrok** or similar tunneling service to expose your local server:
  ```bash
  # Install and run ngrok
  ngrok http 3000
  
  # Copy the https URL from ngrok output
  # Example: https://abc123.ngrok.io
  
  # Use this as your webhook callback URL:
  # https://abc123.ngrok.io/api/whatsapp/webhook
  ```
- Update webhook URL in Meta when you restart ngrok (URL changes each time in free tier)

---

## Shopify Store Configuration

### Prerequisites
- A Shopify store (with admin access)
- Custom app permissions enabled

### Step-by-Step Setup

1. **Create a Custom App**
   - Log in to your Shopify admin panel
   - Go to: Settings → Apps and sales channels → Develop apps
   - Click "Allow custom app development" (if first time)
   - Click "Create an app"
   - Name it (e.g., "WhatsApp CRM Integration")

2. **Configure API Scopes**
   Select the following scopes:
   - `read_orders` - Read order data
   - `write_orders` - Update orders (for COD confirmation)
   - `read_customers` - Read customer information
   - `write_customers` - Update customer data
   - `read_products` - Read product catalog (optional)

3. **Install the App**
   - Click "Install app"
   - Confirm the installation

4. **Get Your Access Token**
   - After installation, you'll see the "Admin API access token"
   - Click "Reveal token once" and copy it (starts with "shpat_...")
   - **Important:** Save this token securely, it won't be shown again

5. **Get Your Shop Domain**
   - Your shop domain is: `yourstore.myshopify.com`
   - You can find this in your Shopify admin URL

6. **Enter Configuration in CRM**
   - Log in to your CRM workspace
   - Navigate to Settings → Shopify Store
   - Enter your shop domain (e.g., `mystore.myshopify.com`)
   - Paste the Admin API access token
   - Verify scopes match what you configured
   - Click "Connect Shopify Store"

### Testing Your Integration
After configuration:
1. Create a test order in Shopify
2. Check if it syncs to your CRM orders page
3. Verify customer data appears in contacts

---

## Webhook Configuration

### WhatsApp Webhook URL
```
https://your-domain.com/api/whatsapp/webhook
```

### Shopify Webhook URLs
Configure these in Shopify admin (Settings → Notifications → Webhooks):

- **Order Creation:** `https://your-domain.com/api/webhooks/shopify/orders/create`
- **Order Update:** `https://your-domain.com/api/webhooks/shopify/orders/update`

---

## Security Best Practices

1. **Never commit credentials to version control**
   - All tokens should be configured via the Settings UI
   - Tokens are stored in the database (encrypted in production)

2. **Use permanent tokens for production**
   - Test tokens expire; generate permanent tokens for production use

3. **Restrict API scopes**
   - Only grant necessary permissions
   - Review scope requirements regularly

4. **Rotate tokens periodically**
   - Change access tokens every 90 days
   - Update configuration via Settings UI

5. **Monitor API usage**
   - Check Meta and Shopify dashboards for unusual activity
   - Set up rate limit alerts

---

## Troubleshooting

### WhatsApp Issues

**Problem:** Messages not sending
- Verify Phone Number ID is correct
- Check access token hasn't expired
- Ensure business account is verified
- Check Meta Cloud API status page

**Problem:** Webhooks not received
- Verify callback URL is publicly accessible
- Check verify token matches
- Ensure fields are subscribed (messages, message_status)
- Check webhook logs in Meta dashboard

### Shopify Issues

**Problem:** Orders not syncing
- Verify shop domain format (must be .myshopify.com)
- Check access token is valid
- Ensure required scopes are granted
- Verify webhooks are configured

**Problem:** Webhook verification fails
- Check webhook URL is correct
- Verify Shopify can reach your server
- Check webhook logs in Shopify admin

---

## API Endpoints

### WhatsApp Integration
- `GET /api/settings/whatsapp` - Get current integration
- `POST /api/settings/whatsapp` - Create integration
- `PUT /api/settings/whatsapp/:id` - Update integration
- `DELETE /api/settings/whatsapp/:id` - Delete integration

### Shopify Store
- `GET /api/settings/shopify` - Get current store
- `POST /api/settings/shopify` - Connect store
- `PUT /api/settings/shopify/:id` - Update store
- `DELETE /api/settings/shopify/:id` - Disconnect store

All endpoints require JWT authentication.
