# 🧪 WhatsApp CRM POC - Feature Testing Checklist

## ✅ Test Results

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Services Running | ✅ | Backend (3000), Frontend (3004), Worker running |
| 2 | User Registration | ⏳ | Testing now... |
| 3 | User Login | ⏳ | Testing now... |
| 4 | Auth Persistence | ⏳ | Testing now... |
| 5 | Settings Page | ⏳ | Testing now... |
| 6 | WhatsApp Integration | ⏳ | Testing now... |
| 7 | Inbox Page | ⏳ | Testing now... |
| 8 | Webhook Verification | ⏳ | Testing now... |
| 9 | Webhook Processing | ⏳ | Testing now... |
| 10 | Real-time Messages | ⏳ | Testing now... |

---

## 📋 Testing Steps

### Test 1: User Authentication ✅
**Steps:**
1. Open http://localhost:3004/register
2. Create new account
3. Login
4. Verify token persists on refresh

**Expected:**
- ✅ Registration succeeds
- ✅ Login works
- ✅ No logout on refresh
- ✅ Dashboard shows after login

---

### Test 2: Settings Page ✅
**Steps:**
1. Go to http://localhost:3004/dashboard/settings
2. Check if form is pre-filled (if integration exists)
3. Update WhatsApp credentials
4. Save

**Expected:**
- ✅ Form loads existing data
- ✅ Can update Phone Number ID
- ✅ Success message appears
- ✅ Data persists after save

---

### Test 3: Inbox Page ✅
**Steps:**
1. Go to http://localhost:3004/dashboard/inbox
2. Check if conversations appear
3. Click a conversation
4. View messages

**Expected:**
- ✅ Seed data shows (3 conversations)
- ✅ Click opens conversation
- ✅ Messages display correctly
- ✅ No 401 errors

---

### Test 4: Webhook Verification ✅
**Steps:**
1. Open ngrok inspector: http://127.0.0.1:4040
2. In Meta console, configure webhook
3. Callback URL: https://[ngrok-url]/api/whatsapp/webhook
4. Verify Token: YOUR_VERIFY_TOKEN
5. Click "Verify and Save"

**Expected:**
- ✅ Meta shows green checkmark
- ✅ Ngrok shows GET request with 200
- ✅ Challenge returned correctly

---

### Test 5: Webhook Message Processing ✅
**Steps:**
1. Send test message from Meta tool
2. Check ngrok inspector (webhook received)
3. Check backend logs (message processed)
4. Check Prisma Studio (message in database)
5. Refresh inbox (message appears)

**Expected:**
- ✅ Webhook arrives (200 OK)
- ✅ Backend logs: "Message stored"
- ✅ New message in database
- ✅ Message shows in inbox
- ✅ New conversation created

---

### Test 6: Real WhatsApp Flow (End-to-End) ✅
**Steps:**
1. Use personal phone
2. Send WhatsApp message to business number
3. Watch webhook in ngrok
4. Check inbox for message
5. Reply from inbox
6. Verify customer receives reply

**Expected:**
- ✅ Customer message arrives in inbox
- ✅ Can send reply from CRM
- ✅ Customer receives reply on WhatsApp
- ✅ Conversation updates in real-time

---

## 🐛 Known Issues

| Issue | Status | Fix |
|-------|--------|-----|
| Phone Number ID Mismatch | 🔧 | Update in Settings |
| Inbox shows empty | 🔧 | Auth token missing |
| Duplicate webhooks | ✅ | Fixed with check |
| Auth lost on refresh | ✅ | Fixed with persistence |

---

## 🔍 Diagnostic Commands

```powershell
# Check if services running
Get-Process -Name "node" | Measure-Object

# Check database
cd backend; npx ts-node diagnose-whatsapp.ts

# Test webhook locally
$body = @'
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "0",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+923486105960",
          "phone_number_id": "123456123"
        },
        "contacts": [{
          "profile": {"name": "Test User"},
          "wa_id": "923009999999"
        }],
        "messages": [{
          "from": "923009999999",
          "id": "wamid.TEST_NOW",
          "timestamp": "1711590000",
          "type": "text",
          "text": {"body": "Testing message flow!"}
        }]
      },
      "field": "messages"
    }]
  }]
}
'@
Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp/webhook" -Method POST -Body $body -ContentType "application/json"

# Check conversations API
# (Open browser console on inbox page)
fetch('http://localhost:3000/api/crm/conversations', {
  headers: {
    'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('auth-storage')).state.token,
    'x-workspace-id': JSON.parse(localStorage.getItem('auth-storage')).state.currentWorkspace.id
  }
}).then(r => r.json()).then(d => console.log(d))
```

---

## 📝 Testing Progress

- [x] Services started
- [ ] User can register
- [ ] User can login  
- [ ] Auth persists on refresh
- [ ] Settings page works
- [ ] WhatsApp integration saved
- [ ] Inbox loads conversations
- [ ] Webhook verification succeeds
- [ ] Webhooks process messages
- [ ] Messages appear in inbox
- [ ] Can reply to messages
- [ ] End-to-end flow works

---

## 🎯 Next Steps

1. Test each feature systematically
2. Document any issues found
3. Fix issues immediately
4. Retest after fixes
5. Mark as ✅ when working

---

*Last updated: {{date}}*
