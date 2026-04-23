# Real-Time WhatsApp Inbox Testing Guide

## 🎯 Complete Testing Workflow

### Prerequisites Checklist
- ✅ Ngrok running: `https://YOUR_NGROK_URL`
- ✅ Backend running on port 3000
- ✅ Frontend running on port 3004
- ✅ Webhook verify token set: `YOUR_VERIFY_TOKEN`
- ✅ WhatsApp Business API connected in Settings page

---

## 🧪 Testing Methods

### Method 1: Meta Test Tool (Recommended for Development)

**Steps:**
1. Open Meta Developer Console: https://developers.facebook.com/apps
2. Select your app → **API Setup**
3. Find **"Send and receive messages"** section
4. Use the built-in test messaging tool:
   - **From:** Your Test WhatsApp Number (provided by Meta)
   - **To:** Any phone number in E.164 format (e.g., `+923001234567`)
   - **Message:** Type anything
   - Click **"Send message"**

**Expected Flow:**
```
Meta Test Tool → WhatsApp Cloud API → Webhook Fired → Your Ngrok URL → Backend → Database → Inbox
```

**Monitoring:**
- Open http://127.0.0.1:4040 to see webhook requests in real-time
- Check backend console for logs
- Refresh inbox page to see new message

---

### Method 2: Real Phone Testing (Production-Like)

**Steps:**
1. **Get your WhatsApp Business phone number** from Meta API Setup
2. **Save it** in your phone contacts
3. **Open WhatsApp** on your phone
4. **Send a message** to that business number: "Testing my CRM! 🚀"

**Expected Flow:**
```
Your Phone → WhatsApp → Meta Platform → Webhook → Ngrok → Backend → Database → Inbox
```

**Timing:** Message appears in inbox within 1-3 seconds

---

### Method 3: Webhook Simulator (Quick Debug)

**Simulate a webhook POST request:**

```powershell
# PowerShell
$body = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "YOUR_BUSINESS_ACCOUNT_ID"
            changes = @(
                @{
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "+923001234567"
                            phone_number_id = "1110254672164163"
                        }
                        contacts = @(
                            @{
                                profile = @{
                                    name = "Test Customer"
                                }
                                wa_id = "923009876543"
                            }
                        )
                        messages = @(
                            @{
                                from = "923009876543"
                                id = "wamid.TEST123"
                                timestamp = [string]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
                                type = "text"
                                text = @{
                                    body = "This is a simulated webhook message!"
                                }
                            }
                        )
                    }
                    field = "messages"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

curl.exe -X POST "http://localhost:3000/api/whatsapp/webhook" `
  -H "Content-Type: application/json" `
  -d $body
```

---

## 📊 Real-Time Monitoring Dashboard

### Open These 3 Tabs:

| Tab | URL | Purpose |
|-----|-----|---------|
| **Ngrok Inspector** | http://127.0.0.1:4040 | See webhook HTTP requests |
| **Backend Logs** | Terminal window | See processing logs |
| **Inbox** | http://localhost:3004/dashboard/inbox | See messages appear |

---

## 🔍 Debugging Webhook Issues

### Check 1: Is Webhook Verified?
```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
# Should return: test123
```

### Check 2: Is Ngrok Tunnel Active?
```bash
curl "https://YOUR_NGROK_URL/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=hello"
# Should return: hello
```

### Check 3: Backend Processing Webhooks?
Look for these logs in backend terminal:
```
[WhatsAppService] Handling webhook event
[WhatsAppService] Message received from +923001234567
[CrmService] Created contact: ...
[CrmService] Created conversation: ...
[CrmService] Created message: ...
```

### Check 4: Database Has Data?
```bash
cd backend
npx prisma studio
# Open in browser, check: contacts, conversations, messages tables
```

---

## ⚡ End-to-End Test Scenario

### Scenario: Customer Sends "Hello" Message

**1. Customer Action:**
- Customer sends: "Hello, I want to order!"
- From phone: +923009876543

**2. Webhook Event (View in Ngrok Inspector):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "1110254672164163"
        },
        "messages": [{
          "from": "923009876543",
          "type": "text",
          "text": { "body": "Hello, I want to order!" }
        }]
      }
    }]
  }]
}
```

**3. Backend Processing:**
- ✅ Validates webhook signature
- ✅ Finds/creates Contact (by phone number)
- ✅ Finds/creates Conversation (for this contact)
- ✅ Creates Message record
- ✅ Updates conversation last message time
- ✅ Sets unread count = 1

**4. Inbox Updates:**
- 🔄 Refresh inbox page (or use WebSocket for real real-time)
- ✅ See new conversation in left sidebar
- ✅ Shows customer name: +923009876543
- ✅ Message preview: "Hello, I want to order!"
- ✅ Unread badge: 1
- ✅ Click conversation → See full message

---

## 🎬 Complete Testing Checklist

### Before Testing:
- [ ] Docker Desktop running
- [ ] Backend server running (`npm run start:dev` in backend/)
- [ ] Frontend server running (`npm run dev` in frontend/)
- [ ] Ngrok tunnel active (`ngrok http 3000`)
- [ ] Webhook verified in Meta (green checkmark)
- [ ] Webhook fields subscribed: messages, message_status

### During Testing:
- [ ] Ngrok Inspector tab open (http://127.0.0.1:4040)
- [ ] Backend terminal visible (watch logs)
- [ ] Inbox page open (http://localhost:3004/dashboard/inbox)
- [ ] Send test message from Meta tool OR real phone

### Expected Results:
- [ ] Webhook appears in Ngrok Inspector (green 200 OK)
- [ ] Backend logs show "Handling webhook event"
- [ ] No errors in backend console
- [ ] Message appears in inbox after refresh
- [ ] Can click conversation and see full message
- [ ] Customer name/phone shows correctly

---

## 🚨 Common Issues & Solutions

### Issue: "Webhook not receiving messages"
**Solutions:**
- Check ngrok is still running (free tier URL changes on restart)
- Update webhook URL in Meta if ngrok URL changed
- Verify webhook subscriptions are active in Meta
- Check backend logs for errors

### Issue: "Message appears in Ngrok but not in Inbox"
**Solutions:**
- Check backend logs for processing errors
- Verify database connection (check Docker)
- Run `npx prisma studio` to check if data is in database
- Check if workspaceId matches your logged-in user

### Issue: "401 Unauthorized in webhook logs"
**Solutions:**
- Webhooks should be public endpoints (no auth required)
- Check `@Public()` decorator is on webhook endpoint
- Verify `whatsapp.controller.ts` has proper decorators

### Issue: "Inbox shows old data, not updating"
**Solutions:**
- Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
- Check if API call is returning data (open Dev Tools → Network tab)
- Verify frontend is connecting to correct backend port (3000)

---

## 📈 Next Steps: Real-Time Updates (WebSocket)

For instant updates without refresh:
1. Implement Socket.IO in backend
2. Emit event when webhook processes message
3. Frontend listens and updates inbox in real-time
4. No page refresh needed!

---

## 🎓 Learning Resources

**Webhook Flow:**
1. WhatsApp user sends message
2. Meta Cloud API receives it
3. Meta calls your webhook URL (POST request)
4. Your backend processes the JSON payload
5. Saves to database (Contact, Conversation, Message)
6. Frontend fetches from API and displays

**Webhook Payload Structure:**
- See: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

**Testing Tools:**
- Ngrok Inspector: http://127.0.0.1:4040
- Prisma Studio: `npx prisma studio`
- Meta Webhooks Tester: https://developers.facebook.com/tools/webhooks/

---

Happy Testing! 🚀
