# Complete Diagnosis - Messages Not Sending

## Summary

✅ **What's Working:**
- Shopify webhooks syncing orders
- Orders appearing in database
- Outbox events being created (order.created)
- Automation configured ("COD Order Confirmation")
- Automation conditions matching (paymentMethod: cod)
- WhatsApp integration configured and active  
- Backend JobsService polling for events

❌ **What's NOT Working:**
- No inbox conversations created
- No WhatsApp messages sent
- Automations executing but actions failing

## Root Cause

The **Worker service** is either:
1. **Not running** (most likely)
2. Running but **encountering errors** that are caught silently
3. Running but **unable to send messages** due to API errors

## Verification Steps

### Step 1: Check if Worker is Running

Open a new terminal and look for a worker process:

```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Select-Object ProcessName, Id, Path
```

You should see multiple node processes. If worker is running via `npm run start:dev`, you'd see it.

**Better way:** Check if you have a terminal/window running the worker:
- Look for a terminal with `cd worker && npm run start:dev` running
- Worker logs would show: 
  ```
  Worker process-order-event started
  Worker send-message started
  Processing outbox events...
  ```

### Step 2: Start the Worker (If Not Running)

```powershell
cd worker
npm run start:dev
```

You should see:
```
[Worker] Outbox worker started (outbox queue)
[Worker] WhatsApp worker started (whatsapp queue)
[Worker] Waiting for jobs...
```

**Within 5 seconds**, you should see:
```
Processing outbox job: process-order-event
Executing automation: COD Order Confirmation
Sending WhatsApp message to +923234858795
✅ Message sent successfully
✅ Completed: process-order-event
```

### Step 3: Check Worker Logs for Errors

If worker IS running but messages not sending, watch the worker logs carefully:

Common errors:
- `Cannot send message: missing order or contact phone`
- `WhatsApp not connected`
- `WhatsApp API error: [error details]`
- `Request failed with status code 400/401/403`

### Step 4: Test with a Fresh Order

1. **Ensure worker is running**
2. **Create a new order in Shopify with:**
   - Customer name
   - WhatsApp phone: +923234858795
   - Payment method: Cash on Delivery (COD)
   - Products and mark as paid

3. **Watch worker logs** - You should see within 5-10 seconds:
   ```
   Processing order event: order.created
   Executing automation: COD Order Confirmation
   Sending message to +923234858795
   ✅ Message sent
   ```

4. **Check CRM Inbox** - Conversation should appear

## Common Issues & Solutions

### Issue: Worker Not Running
**Symptom:** No worker logs visible  
**Solution:** Start it with `cd worker && npm run start:dev`

### Issue: Redis Not Running
**Symptom:** Worker crashes with "ECONNREFUSED" or "Redis connection failed"  
**Solution:** 
```powershell
# Install and start Redis
docker run -d -p 6379:6379 redis
```

### Issue: Phone Number Format
**Symptom:** Message send fails with "Invalid phone number"  
**Solution:** Ensure phone has country code: +923234858795 (not 03234858795)

### Issue: WhatsApp API Quota
**Symptom:** API returns "rate limit" or "quota exceeded"  
**Solution:** Check Meta Business Manager for messaging limits

### Issue: Access Token Expired
**Symptom:** API returns 401 Unauthorized  
**Solution:** Refresh access token in Settings → WhatsApp

## Recommended Actions

### Immediate (Do This Now):

1. **Start the worker** (if not running):
   ```powershell
   cd worker
   npm run start:dev
   ```

2. **Watch logs for 30 seconds** - existing outbox events should process

3. **Check CRM Inbox** - conversations should appear

### Long-term (Better Workflow):

Use the start script that runs everything together:

```powershell
.\start-wt.bat
```

This opens 4 tabs:
- Backend (port 3000)
- Frontend (port 3001)
- Worker (background processing)
- ngrok (webhook tunnel)

With all services running, your automation will work end-to-end:
```
Shopify Order → Webhook → Backend → Outbox Event → Worker → Automation → WhatsApp Message → Inbox
```

## After Starting Worker

If worker was the issue, within 5-10 seconds of starting it, you should see:
- Worker logs showing automation execution
- Messages being sent to WhatsApp  
- Conversations appearing in CRM inbox
- Contact receiving WhatsApp messages

The 10 pending outbox events will be processed automatically!

## Still Not Working?

If worker is running and still no messages:

1. **Check worker logs** for specific errors
2. **Test WhatsApp API manually**:
   ```powershell
   curl -X POST "https://graph.facebook.com/v21.0/1067030056491121/messages" ^
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
     -H "Content-Type: application/json" ^
     -d "{\"messaging_product\":\"whatsapp\",\"to\":\"+923234858795\",\"type\":\"text\",\"text\":{\"body\":\"Test message\"}}"
   ```

3. **Check Meta Business Manager** for API restrictions or errors

4. **Check phone number** is registered as a test number (for  development)

## Expected Result

With worker running:
- ✅ Orders sync from Shopify
- ✅ Automation detects COD orders
- ✅ WhatsApp messages sent automatically
- ✅ Conversations appear in inbox
- ✅ Customer receives confirmation message
- ✅ Customer can reply YES/NO
- ✅ Your team sees responses in inbox

This is the complete CRM workflow in action!
