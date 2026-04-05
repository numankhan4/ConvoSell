# WhatsApp Error: Account Not Registered (#133010)

## Error Details

**Error Code**: `133010`  
**Error Message**: `"(#133010) Account not registered"`  
**Status**: `400 Bad Request`  
**WWW-Authenticate Header**: `OAuth "Facebook Platform" "invalid_request" "(#133010) Account not registered"`

## What This Means

The phone number you're trying to send a message to (**+923234858795** in your case) is **not registered** as a valid recipient in your WhatsApp Business Account.

Meta requires you to explicitly register phone numbers before you can send messages to them during development/testing.

---

## Solution: Register Test Phone Numbers

### Step 1: Go to Meta Business Manager

1. Open **[Meta Business Manager](https://business.facebook.com/)**
2. Log in with your Facebook account
3. Select your **Business Account** (the one with your WhatsApp Business API)

### Step 2: Navigate to WhatsApp Settings

1. Click **Business settings** (gear icon in top right)
2. In the left sidebar, find **Accounts** section
3. Click **WhatsApp Accounts**
4. Select your WhatsApp Business Account

OR:

1. Go directly to **[WhatsApp Manager](https://business.facebook.com/wa/manage/)**
2. Select your phone number

### Step 3: Add Test Phone Numbers

1. In WhatsApp Manager, click on your **Phone Number**
2. Scroll to **"Phone numbers"** tab or **"API Setup"** section
3. Look for **"Add phone number"** or **"Manage phone numbers"**
4. Click **"Add"** or **"Add test recipient"**

### Step 4: Enter Phone Number

1. Enter the phone number in **international format**:
   ```
   +923234858795
   ```
   (Include country code, no spaces)

2. The recipient will receive a **verification code** via SMS or WhatsApp

3. Enter the verification code

4. Phone number is now **registered** ✅

### Step 5: Test Again

1. Create a new order in Shopify with this phone number
2. Worker will process the automation
3. Message should send successfully
4. Check CRM inbox for the conversation

---

## Important Notes

### Development vs Production

**During Development** (Current):
- Must register each test phone number manually
- Limited to 5-10 test numbers
- Free tier restrictions apply
- Messages sent to unregistered numbers will fail with #133010

**In Production** (After Approval):
- Can send to ANY phone number (no registration required)
- Must go through Meta's Business Verification
- Requires displaying Privacy Policy and Terms
- May have messaging limits based on quality score

### Multiple Test Numbers

If you need to test with multiple customers:

1. Add each phone number as a test recipient
2. They'll all receive verification codes
3. After verification, you can send to all of them

### Current Registered Numbers

Check which numbers are already registered:
1. WhatsApp Manager → Phone numbers → Test numbers
2. You'll see a list of verified test recipients

---

## Alternative: Use Your Own Phone Number

The easiest way to test:

1. **Register your own WhatsApp number** as a test recipient
2. When creating test orders in Shopify:
   - Use **your own phone number** as the customer
   - Example: +92 XXX XXXXXXX (your number)
3. You'll receive the WhatsApp messages on your phone
4. You can test the full flow (receive, reply, etc.)

---

## Quick Reference

**Error**: Phone number not registered  
**Fix**: Meta Business Manager → WhatsApp → Add phone number  
**Format**: +[country code][number] (e.g., +923234858795)  
**Limit**: 5-10 test numbers during development  
**Production**: No registration needed (after verification)

---

## After Registering Phone Numbers

Once you've added the test phone numbers:

### 1. Restart Worker (Optional)

The worker should automatically retry, but you can restart for a clean slate:
```powershell
# Stop worker (Ctrl+C)
# Start again
cd worker
npm run start:dev
```

### 2. Create Test Order

1. Go to **Shopify Admin** → **Orders** → **Create order**
2. Customer details:
   - **Name**: Test Customer
   - **Phone**: **+923234858795** (or your registered test number)
   - **Email**: test@example.com
3. Add products
4. **Payment method**: Cash on Delivery (COD)
5. Mark as **Paid** (if required)
6. Click **Save**

### 3. Watch Worker Logs

Within 5-10 seconds, you should see:
```
Processing order event: order.created
Executing automation: COD Order Confirmation

📤 Sending WhatsApp message...
   To: Test Customer (+923234858795)
   Order: #1005
   ✅ Message sent successfully!
   WhatsApp Message ID: wamid.XXX=
   💬 Created new conversation: cmnXXXXXXX
   💾 Message saved to database
   🎉 Complete! Message delivered and tracked.
```

### 4. Check CRM Inbox

1. Go to **CRM** → **Inbox**
2. You should see a new conversation with the customer
3. The automation message should be visible
4. Status: **Sent** ✅

### 5. Check Phone

The registered phone number should receive the WhatsApp message:
```
Hello Test Customer! 👋

Thank you for your order #1005!

📦 Order Total: USD 1774.95
💰 Payment Method: Cash on Delivery (COD)

Please reply with:
✅ YES to confirm your order
❌ NO to cancel

We'll deliver within 2-3 business days after confirmation.
```

With action buttons:
- **Confirm Order**
- **Cancel Order**

---

## Common Issues After Registration

### Still Getting #133010
- **Wait 5-10 minutes** after registration for Meta's systems to sync
- Verify the phone number format matches exactly (with + and country code)
- Check you selected the correct Business Account

### Verification Code Not Received
- Check SMS instead of WhatsApp (or vice versa)
- Try "Resend code"
- Ensure phone number is active and can receive messages

### Can't Add More Test Numbers
- Free tier limit reached (5-10 numbers)
- Remove old test numbers you're not using
- OR apply for production access

### Messages Still Not Sending
- Check worker logs for different errors
- Verify access token is valid (Settings → WhatsApp)
- Check phone number format in Shopify orders

---

## Moving to Production

When ready to send messages to any customer (not just test numbers):

### 1. Business Verification

- Complete Meta Business Verification
- Submit Business documents
- Provide Privacy Policy and Terms of Service URLs
- Display opt-in mechanism for customers

### 2. WhatsApp Business Profile

- Set up complete business profile
- Add business description
- Add business category
- Verify business details

### 3. Request Production Access

- Submit for production approval
- Meta reviews within 1-2 weeks
- Initial limit: 1,000 unique users per 24 hours
- Tier increases based on quality score

### 4. After Approval

- Remove test number restrictions
- Send to ANY phone number
- No manual registration required
- Monitor quality score and limits

---

## Summary

✅ **Problem**: Phone number not registered  
✅ **Solution**: Add as test recipient in Meta Business Manager  
✅ **Steps**: Business Manager → WhatsApp → Add phone number → Verify  
✅ **Test**: Create Shopify order with registered number  
✅ **Result**: Messages send successfully, inbox updated

**You only need to register each test number ONCE!**
