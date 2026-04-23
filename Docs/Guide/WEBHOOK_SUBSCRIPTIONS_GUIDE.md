# WhatsApp Webhook Subscriptions Guide
**Complete guide to webhook field subscriptions for your CRM**

---

## 📊 Quick Decision Matrix

| Field Name | Priority | Current Backend Support | Should Subscribe? |
|------------|----------|------------------------|-------------------|
| `messages` | 🔴 **CRITICAL** | ✅ Fully Implemented | ✅ **YES - REQUIRED** |
| `messaging_handovers` | � **OPTIONAL** | ⚠️ Requires Platform Partner | ⚪ **SKIP - Not available** |
| `account_alerts` | 🔵 **OPTIONAL** | ❌ Not implemented | ⚪ Optional |
| `message_template_status_update` | 🔵 **OPTIONAL** | ❌ Not implemented | ⚪ Optional |
| `phone_number_quality_update` | 🔵 **OPTIONAL** | ❌ Not implemented | ⚪ Optional |

---

## 🎯 Recommended Configuration (Start Here)

**For immediate functionality, subscribe to:**

1. ✅ **`messages`** (REQUIRED - Core functionality)

**That's it!** This single field gives you full 2-way messaging capability.

**Optional fields to skip for now:**
- ⚪ `messaging_handovers` - Requires WhatsApp Platform Partner status (not available for standard apps)
- ⚪ Other fields require backend implementation

---

## 📖 Detailed Field Explanations

### 🔴 CRITICAL - Must Subscribe

#### 1. `messages`
**What it does:**
- Receives incoming customer messages (text, images, videos, documents)
- Includes message delivery status updates (sent → delivered → read)
- Handles interactive message responses (buttons, lists)

**Why you need it:**
- ❌ **WITHOUT**: Your Inbox will be completely empty
- ✅ **WITH**: Full 2-way conversation capability

**Backend Implementation:**
```typescript
// ✅ FULLY IMPLEMENTED
- Handles text, image, video, document, audio messages
- Tracks delivery/read receipts
- Processes button/interactive responses
- Automatically creates contacts
- Stores message history
```

**What happens when triggered:**
1. Customer sends message to your WhatsApp number
2. Meta sends webhook POST to your server
3. Backend processes message and saves to database
4. Message appears in your CRM Inbox
5. Status updates (delivered/read) tracked automatically

---

### 🟢 RECOMMENDED - Subscribe Now

#### 2. `messaging_handovers`
**What it does:**
- Notifies when conversation ownership changes between agents
- Handles "takeover" events when agent claims a conversation
- Manages conversation routing between human agents and bots

**⚠️ IMPORTANT - Not Available for Standard Apps:**
- **Requires:** WhatsApp Platform Partner status
- **Error when subscribing:** "Failed to subscribe to the messaging_handovers webhook field"
- **Why:** This feature is restricted to approved WhatsApp Platform Partners only
- **Solution:** Skip this field - it's not needed for core CRM functionality

**When you might get access:**
- If you become a WhatsApp Business Solution Provider (BSP)
- If you're building a multi-agent platform at scale
- After Meta partnership approval process

**Backend Implementation:**
```
⚠️ NOT YET IMPLEMENTED
- Would need to add handler in whatsapp.service.ts
- Only relevant if you gain Platform Partner access
```

**Use cases (if you had access):**
- Agent A hands off conversation to Agent B
- Bot transfers conversation to human agent
- Conversation escalation workflows

**Current Status:** ⚪ **SKIP THIS FIELD** - Not available without special permissions

---

### 🔵 OPTIONAL - Consider for Future

#### 3. `account_alerts`
**What it does:**
- Sends critical notifications about your WhatsApp Business Account
- Alerts for rate limits, restrictions, or policy violations

**When to subscribe:**
- If you're sending high volume of messages
- Want to monitor account health proactively
- Need alerts for compliance issues

**Current Status:** ❌ Not implemented (would require backend update)

---

#### 4. `message_template_status_update`
**What it does:**
- Notifies when your message templates are approved/rejected by Meta
- Updates on template quality ratings

**When to subscribe:**
- If you're creating many custom message templates
- Want automated notifications of template status changes
- Running marketing campaigns with templates

**Current Status:** ❌ Not implemented (would require backend update)

---

#### 5. `phone_number_quality_update`
**What it does:**
- Updates on your phone number's quality rating (GREEN/YELLOW/RED)
- Alerts when quality score changes due to blocks/reports

**When to subscribe:**
- High-volume messaging operations
- Monitoring sender reputation
- Compliance and quality tracking

**Current Status:** ❌ Not implemented (would require backend update)

---

## ⚙️ How to Subscribe (Step-by-Step)

### In Meta Developer Dashboard:

1. **Navigate to Configuration**
   - Go to: https://developers.facebook.com/apps
   - Select your app: "ConvoSell CRM"
   - Click: WhatsApp → Configuration

2. **Edit Webhook**
   - Scroll to "Webhook" section
   - Click "Edit" button
   - Your webhook should already be verified

3. **Manage Webhook Fields**
   - Scroll down to "Webhook fields" section
   - You'll see a list of all available fields

4. **Subscribe to Required Field**
   - Find `messages` field
   - Click **"Subscribe"** button next to it
   - ⚠️ **SKIP** `messaging_handovers` - Will fail (requires Platform Partner status)

5. **Save Changes**
   - Click "Save" at the bottom
   - Your subscription is now active!

---

## 🧪 Testing Your Subscriptions

### Test `messages` Subscription:

**Method 1: Send from WhatsApp Test Number**
```
1. Open WhatsApp on your phone
2. Send message to: +1 555 186 3742 (Meta test number)
3. Check your CRM Inbox - message should appear
```

**Method 2: Check Backend Logs**
```bash
# Watch backend console - should see:
Received message from 1234567890: text
Processing incoming message...
Message saved to database
```

### Test Webhook Delivery:

**Check Meta Dashboard:**
1. Go to: WhatsApp → Configuration → Webhook
2. Scroll to "Recent Deliveries"
3. You should see POST requests with 200 OK status

---

## 🚨 Troubleshooting

### "Messages" subscribed but Inbox still empty?

**Check these:**
1. ✅ Backend server is running (port 3000)
2. ✅ ngrok is forwarding to localhost:3000
3. ✅ Webhook URL is correct: `/api/whatsapp/webhook`
4. ✅ Verify token matches .env file
5. ✅ App is in "Development mode" (test messages work)

**Test manually:**
```bash
# Send test webhook POST (replace YOUR-NGROK-URL):
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "type": "text",
            "text": {"body": "Test message"}
          }]
        }
      }]
    }]
  }'
```

### "Failed to subscribe to messaging_handovers" error?

**Error Message:**
```
Failed to subscribe to the messaging_handovers webhook field
```

**This is NORMAL and EXPECTED!** ✅

**Why it happens:**
- `messaging_handovers` requires **WhatsApp Platform Partner** status
- Standard WhatsApp Business API apps don't have this permission
- Meta restricts this field to approved Business Solution Providers (BSPs)

**What to do:**
1. ✅ **Ignore this error** - it won't affect your CRM functionality
2. ✅ **Skip subscribing** to this field
3. ✅ **Only subscribe to `messages`** field

**Will this break my CRM?**
- ❌ NO! Your backend doesn't use this field anyway
- ✅ All core features work with just `messages` subscription
- ✅ You get full 2-way messaging without it

**When you might get access:**
- If you become a WhatsApp Business Solution Provider
- If you're building a multi-agent platform at enterprise scale
- After completing Meta's partnership approval process

---

### Subscription shows "Unsubscribed" after saving?

**Possible causes:**
1. Webhook verification failed
2. App not in correct mode
3. Permissions issue

**Fix:**
1. Re-verify webhook URL
2. Check backend logs for errors
3. Ensure app has proper permissions

---

## 📈 What's Next? (Future Enhancements)

### Fields to Implement Later:

**Phase 2: Enhanced Features**
- `message_echoes` - Multi-device support (see messages sent from phone/web)
- `messaging_handovers` - Backend implementation for agent routing

**Phase 3: Advanced Monitoring**
- `account_alerts` - Automated account health monitoring
- `phone_number_quality_update` - Quality score tracking dashboard

**Phase 4: Template Management**
- `message_template_status_update` - Template approval workflow automation
- Template library in CRM UI

---

## ✅ Checklist - Did You Complete Setup?

- [ ] Subscribed to `messages` field in Meta
- [ ] Clicked "Save" in Meta dashboard  
- [ ] Sent test message to verify Inbox receives it
- [ ] Checked backend logs confirm webhook processing
- [ ] Verified message status updates (delivered/read) work

**Note:** Skip `messaging_handovers` - requires special Platform Partner permissions

**Once all checked ✅ - Your webhook configuration is complete! 🎉**

---

## 🔗 Related Documentation

- [WHATSAPP_SETUP_GUIDE.md](./WHATSAPP_SETUP_GUIDE.md) - Complete WhatsApp setup
- [CONFIGURATION.md](./CONFIGURATION.md) - General configuration guide
- [Official Meta Webhooks Docs](https://developers.facebook.com/docs/whatsapp/webhooks)

---

**Last Updated:** April 5, 2026  
**Your Configuration:** ConvoSell CRM - ngrok: YOUR_NGROK_URL
