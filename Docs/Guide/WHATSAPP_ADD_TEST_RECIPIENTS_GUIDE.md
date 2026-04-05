# WhatsApp Test Recipients - Correct Setup Guide

## ⚠️ Common Confusion

**What you're trying**: Register a NEW WhatsApp Business phone number  
**What you need**: Add test recipients (customers who can receive messages)

These are completely different!

---

## The Correct Way (No Token Generation Required)

### Step 1: Go to WhatsApp Test Numbers Page

1. Open: **https://business.facebook.com/wa/manage/phone-numbers/**
2. OR: Meta Business Manager → WhatsApp → Phone Numbers
3. You should see your existing phone number: `1067030056491121`

### Step 2: Click on Your Phone Number

1. Find the phone number row
2. Click on it to open details

### Step 3: Find "Send and receive messages" Section

Look for a section that says:
- **"Send and receive messages"**
- OR **"To and From"**
- OR **"Test Numbers"** / **"Phone Numbers"**

### Step 4: Add Recipients (Two Methods)

#### Method A: Via "To" Field (Simplest)

Some interfaces have a simple "To" field where you can directly add numbers:

1. Look for **"Add phone number"** or **"Manage phone numbers"**
2. Enter: `+923234858795`
3. Click **"Add"**
4. Recipient receives SMS/WhatsApp verification code
5. Enter code → Done! ✅

#### Method B: Via Conversations Settings

1. Look for **"Messaging"** tab or **"API Setup"**
2. Scroll to **"Step 4: Send messages with the API"**
3. Find **"To phone number"** section
4. Click **"Manage phone number list"**
5. Click **"Add phone number"**
6. Enter: `+923234858795`
7. Send verification → Enter code → Done! ✅

---

## Alternative: Use WhatsApp Manager Direct Link

Try this direct link:

**https://business.facebook.com/wa/manage/phone-numbers/?business_id=YOUR_BUSINESS_ID**

(Replace YOUR_BUSINESS_ID with your actual business ID)

Once there:
1. Select your phone number
2. Look for "API Setup" or "Configuration" tab
3. Find "Add recipient" or "Test numbers" section

---

## If You Still Can't Find It

### Try the App Dashboard Method

1. Go to: **https://developers.facebook.com/apps/**
2. Select your WhatsApp app
3. Left sidebar → **WhatsApp** → **API Setup**
4. Under **"Step 5: Send messages with the API"**:
   - You'll see "To:" field
   - Click **"Manage phone number list"**
   - Add `+923234858795`

---

## Why You're Getting the Error

The error you saw:
```
Missing Permission | URI: /v22.0/1067030056491121/register
```

This is because you're trying to **REGISTER a new phone number** to WhatsApp Business API, which requires:
- Business verification
- Phone number ownership proof
- Special permissions from Meta

**You don't need this!** You already have a registered phone number (`1067030056491121`). You just need to add test recipients.

---

## The Difference Explained

### Registering a Phone Number (What You Tried - Wrong)
- **Purpose**: Add a NEW phone number to send messages FROM
- **Requires**: Business verification, ownership proof, permissions
- **Error**: #100 Missing Permission
- **You don't need this!**

### Adding Test Recipients (What You Need - Correct)
- **Purpose**: Add phone numbers to send messages TO
- **Requires**: Just the recipient's phone number
- **Process**: Add number → They verify → Done
- **No special permissions needed**

---

## Quick Alternative: Use Your Own Phone

Instead of adding `+923234858795`, try using YOUR OWN phone number:

1. Add your personal WhatsApp number as a test recipient
2. Create Shopify orders using your phone number
3. You'll receive the messages on your phone
4. Test the full flow yourself

**Benefits**:
- You control the verification
- Instant testing
- No need to coordinate with others

---

## Step-by-Step with Screenshots References

### If You See This Screen:

**Screen 1**: Phone number list
- Action: Click on your phone number `1067030056491121`

**Screen 2**: Phone number details  
- Action: Look for tabs: "Configuration", "API Setup", or "Messaging"

**Screen 3**: API Setup tab
- Action: Scroll to "Send messages" section
- Look for: "To phone number" field

**Screen 4**: Manage phone numbers
- Action: Click "Add phone number"
- Enter: `+923234858795`
- Click "Send code"

**Screen 5**: Verification
- Recipient enters code received via SMS
- OR you enter code if it's your number

**Screen 6**: Success ✅
- Number added to test recipients
- You can now send messages to this number

---

## Testing After Adding Recipients

Once the number is verified:

### 1. Test via API (Quick Check)

```bash
curl -X POST "https://graph.facebook.com/v21.0/1067030056491121/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "+923234858795",
    "type": "text",
    "text": { "body": "Test message" }
  }'
```

### 2. Test via CRM (Full Workflow)

1. Create order in Shopify with `+923234858795`
2. Watch worker logs
3. You should see:
   ```
   ✅ Message sent successfully!
   WhatsApp Message ID: wamid.XXX
   ```
4. Check CRM inbox
5. Recipient receives WhatsApp message

---

## Common Issues

### "Can't find where to add recipients"

Different Meta interfaces have different layouts. Try:
1. **WhatsApp Manager** (business.facebook.com/wa/manage/)
2. **Facebook Developer Console** (developers.facebook.com/apps/)
3. **Business Settings** (business.facebook.com/settings/)

All of these have phone number management, just in different places.

### "Verification code not received"

- Check SMS instead of WhatsApp (or vice versa)
- Wait 1-2 minutes
- Click "Resend code"
- Ensure number is correct (+923234858795)

### "Already verified but still getting error #133010"

- Wait 5-10 minutes for Meta's systems to sync
- Restart worker
- Create fresh order
- Check phone number format matches exactly

---

## Summary

✅ **Don't**: Try to register a new phone number (causes permission error)  
✅ **Do**: Add test recipients to your existing phone number  
✅ **Where**: WhatsApp Manager → Your phone number → Add recipients  
✅ **No tokens needed**: Just add the number and verify  
✅ **Alternative**: Use your own phone number for testing

Once recipient is verified, create a Shopify order with that number and the automation will work!
