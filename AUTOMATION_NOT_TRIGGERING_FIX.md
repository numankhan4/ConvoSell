# Automation Not Triggering - Solution

## Issue

Orders are syncing from Shopify to the CRM successfully, but:
1. ❌ WhatsApp messages are not being sent automatically
2. ❌ Inbox is empty (no conversation created)
3. ❌ Automations are not triggering

## Root Cause

The **Worker service is not running**. The worker is responsible for:
- Processing outbox events (order.created, etc.)
- Triggering automations
- Sending WhatsApp messages
- Creating inbox conversations

Without the worker, orders will appear in your database but automations won't execute.

---

## Solution: Start the Worker

### Quick Fix (Start Worker Now)

Open a **new terminal** and run:

```powershell
cd worker
npm run start:dev
```

You should see:
```
Worker process-order-event started
Worker send-message started
Processing outbox events every 5 seconds...
```

### Automatic Start (Use Start Scripts)

Instead of starting services individually, use the provided start scripts that start everything together:

**Option 1: Windows Terminal (Recommended)**
```powershell
.\start-wt.bat
```
This opens separate tabs for:
- Backend
- Frontend  
- Worker
- ngrok

**Option 2: PM2 (Production-like)**
```powershell
npm run start:all
```
This uses PM2 to manage all services.

**Option 3: Manual All Services**
Open 4 separate terminals and run:
```powershell
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Worker
cd worker
npm run start:dev

# Terminal 4 - ngrok
npm run start:windows
```

---

## Verify Worker is Running

After starting the worker, you should see logs like:

```
[Worker] Outbox worker started
[Worker] WhatsApp worker started
[Worker] Polling outbox events every 5 seconds...
```

### Test Automation:

1. **Create a test automation** (if you haven't already):
   - Go to CRM → **Settings** → **Automations**
   - Create automation with trigger: "Order Created"
   - Add action: "Send WhatsApp Message"
   - Message template: "Hi {contact.name}! Thanks for your order #{order.number}!"

2. **Create a new order in Shopify**:
   - Shopify Admin → Orders → Create order
   - Add customer with valid WhatsApp phone number
   - Add products and mark as paid
   - Save order

3. **Check worker logs**:
   ```
   Processing order event: order.created
   Executing automation: Order Confirmation
   ✅ WhatsApp message sent
   ```

4. **Check CRM Inbox**:
   - Go to CRM → **Inbox**
   - You should see a conversation with the customer
   - Message should be sent via WhatsApp

---

## System Architecture (For Understanding)

```
Shopify Order Created
    ↓
Backend receives webhook
    ↓
Creates order in database
    ↓
Creates outboxEvent (order.created)
    ↓
JobsService polls outboxEvents every 5s
    ↓
Enqueues to BullMQ (Redis queue)
    ↓
Worker consumes queue
    ↓
Triggers automations
    ↓
Sends WhatsApp messages
    ↓
Creates inbox conversation
```

**If worker is not running**, the process stops at step 4. Events pile up in the database but never get processed.

---

## Common Issues

### Worker exits immediately
**Symptom:** Worker starts but crashes
**Cause:** Missing Redis connection
**Solution:** Check `.env` file has `REDIS_URL=redis://localhost:6379`

### Worker runs but doesn't process events
**Symptom:** Worker logs show "started" but no processing
**Cause:** Redis not running
**Solution:** 
```powershell
# Install Redis (Windows)
# Option 1: Use Docker
docker run -d -p 6379:6379 redis

# Option 2: Use Windows Redis port
# Download from: https://github.com/tporadowski/redis/releases
```

### Automations don't trigger even with worker running
**Symptom:** Worker processes events but no messages sent
**Cause:** No automations configured or automation disabled
**Solution:**
- Check CRM → Settings → Automations
- Ensure automation is enabled (toggle switch on)
- Ensure trigger matches: "Order Created" or "order.created"

### WhatsApp messages not sent
**Symptom:** Automation triggers but messages fail
**Cause:** WhatsApp integration not configured or inactive
**Solution:**
- Check CRM → Settings → WhatsApp Integration
- Ensure status is "Connected"
- Check webhook URL is correct
- Test by sending a manual message

---

## Permanent Solution

Update your development workflow to **always start the worker**:

1. **Add to your daily start routine**:
   - Use `start-wt.bat` (starts all services automatically)
   - OR use `npm run start:all` (PM2 mode)

2. **Add to README checklist**:
   ```markdown
   ## Starting Development
   - [ ] Start Backend
   - [ ] Start Frontend
   - [ ] Start Worker ✅ DON'T FORGET THIS!
   - [ ] Start ngrok
   ```

3. **Create a reminder file** in the root:
   ```
   REMINDER: Always start the worker!
   Without it, automations won't trigger.
   ```

---

## Summary

- ✅ Orders sync even without worker (database writes work)
- ❌ Automations need worker to trigger
- ❌ WhatsApp messages need worker to send
- ❌ Inbox conversations need worker to create

**Always run the worker in development!**

Start it now:
```powershell
cd worker
npm run start:dev
```

Then test by creating a new order in Shopify.
