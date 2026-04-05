# Production-Ready Token Management Guide

## 🎯 Problem Solved

Your WhatsApp CRM now has **enterprise-grade token management** that prevents downtime and ensures reliable operation in production.

---

## ✨ What's Been Added

### 1. **Token Expiration Tracking**
- Database now stores token type and expiration date
- Supports 3 token types:
  - `temporary` - Short-lived (1-3 days)
  - `long-lived` - Medium-lived (60 days) 
  - `system-user` - Never expires ✅ **Recommended for Production**

### 2. **Automatic Health Monitoring**
- Worker checks all integrations every hour
- Validates tokens with WhatsApp API
- Detects approaching expiration (7-day warning)
- Auto-refreshes tokens when possible

### 3. **Smart Token Refresh**
- Automatic refresh for long-lived tokens
- Proactive refresh 3 days before expiry
- Fallback to manual update if refresh fails

### 4. **User Notifications**
- Visual banner on dashboard when token issues detected
- Color-coded warnings (amber for warning, red for errors)
- Direct link to settings page to update token
- Real-time status updates every 5 minutes

### 5. **Health Check API**
- `/api/health/workspace` - Get workspace integration status
- `/api/health/system` - Overall system health (for monitoring tools)

---

## 🚀 Production Deployment Options

### **Option 1: System User Tokens (Recommended)**

**Best For:** Production deployments, minimal maintenance

**Setup:**
1. Go to **Meta Business Manager** → System Users
2. Click **"Add"** → Create new system user
3. Assign **WhatsApp permissions** to the system user
4. Generate token with **"Never Expires"** option
5. Copy the token and update in your CRM Settings

**Benefits:**
- ✅ Never expires
- ✅ Zero maintenance
- ✅ Most stable for production
- ✅ Recommended by Meta for server-to-server apps

**Update Token in CRM:**
```
Dashboard → Settings → WhatsApp Tab
- Access Token: [Paste system user token]
- Token Type: Select "System User"
- Token Expires At: Leave empty (never expires)
```

---

### **Option 2: Long-Lived Tokens with Auto-Refresh**

**Best For:** When you can't use system users, need automatic renewal

**Setup:**
1. Generate initial long-lived token (60 days)
2. Get a refresh token from Meta
3. Update both in CRM settings

**CRM Configuration:**
```
Dashboard → Settings → WhatsApp Tab
- Access Token: [Your access token]
- Refresh Token: [Your refresh token]
- Token Type: Select "Long-Lived"
- Token Expires At: [Set expiration date]
```

**How It Works:**
- Worker automatically checks health every hour
- Refreshes token 3 days before expiration
- Sends warnings 7 days before expiration
- Falls back to manual update if refresh fails

---

### **Option 3: Manual Token Management**

**Best For:** Development, testing, small deployments

**Setup:**
1. Generate temporary token from Meta
2. Update in CRM when it expires
3. Receive warnings 7 days before expiration

**Limitations:**
- ⚠️ Requires manual updates every 60 days
- ⚠️ Risk of downtime if token expires
- ⚠️ Not recommended for production

---

## 📊 Monitoring & Alerts

### **Built-in Health Checks**

The worker runs health checks every hour and:
- ✅ Validates token with WhatsApp API
- ✅ Checks expiration dates
- ✅ Attempts automatic refresh
- ✅ Updates database health status
- ✅ Shows warnings in dashboard

### **Integration with Monitoring Tools**

**Monitor the health endpoint:**
```bash
curl http://your-api-url/api/health/system
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-01T10:00:00.000Z",
  "integrations": {
    "whatsapp": {
      "total": 5,
      "healthy": 4,
      "warning": 1,
      "error": 0
    }
  }
}
```

**Set up alerts in your monitoring tool:**
- Alert when `status !== "healthy"`
- Alert when `error > 0`
- Send notifications to admin team

---

## 🔧 Database Migration

**Run the migration:**
```bash
cd backend
npx prisma migrate dev --name add_token_expiration_tracking
npx prisma generate
```

**Or reset and migrate:**
```bash
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
```

---

## 🎨 UI Updates

### **Dashboard Banner**
- Automatically appears when token issues detected
- Shows countdown to expiration
- Direct link to fix the issue
- Can be dismissed (reappears on page reload)

### **Settings Page Updates**
- New fields for token type and expiration
- Health status display
- Last health check timestamp
- Error messages when applicable

---

## 📝 Best Practices

### **For Production:**
1. ✅ Use System User tokens (never expire)
2. ✅ Set up monitoring on `/api/health/system`
3. ✅ Configure alerts for token expiration
4. ✅ Document token refresh procedures
5. ✅ Keep backup tokens ready

### **For Development:**
1. Use temporary tokens (easy to regenerate)
2. Test token expiration scenarios
3. Verify health check notifications work
4. Test automatic refresh (if using long-lived tokens)

### **Security:**
1. Never commit tokens to git
2. Use environment variables in production
3. Encrypt tokens in database (TODO: implement)
4. Rotate tokens regularly
5. Limit permissions to minimum required

---

## 🐛 Troubleshooting

### **Token Expired Error**
**Symptom:** Red banner saying "Access token has expired"

**Solution:**
1. Go to Settings → WhatsApp tab
2. Generate new token from Meta Business Manager
3. Update Access Token field
4. Set Token Type and Expiration Date
5. Save changes

**Health check will automatically verify the new token**

---

### **Token Expiring Soon Warning**
**Symptom:** Amber banner saying "Token expires in X days"

**Options:**
1. **If using System User:** Ignore (doesn't apply)
2. **If using Long-Lived with Refresh:** System will auto-refresh
3. **If using Manual:** Generate new token now to avoid downtime

---

### **Automatic Refresh Failed**
**Symptom:** Error despite having refresh token configured

**Check:**
1. Verify `META_APP_ID` in `.env`
2. Verify `META_APP_SECRET` in `.env`
3. Check worker logs for refresh errors
4. Regenerate refresh token from Meta
5. Update both access and refresh tokens

---

### **Health Check Not Running**
**Symptom:** `lastHealthCheck` timestamp is old

**Check:**
1. Verify worker is running: Check terminal with "Worker" title
2. Check worker logs for errors
3. Restart worker: `cd worker && npm run start:dev`
4. Verify Redis is running: `docker ps`

---

## 🔄 Migration from Old System

If you have existing WhatsApp integrations without expiration tracking:

**Automatic Migration:**
1. Run `npx prisma migrate dev`
2. Existing integrations will have:
   - `tokenType`: "temporary" (default)
   - `tokenExpiresAt`: 60 days from now
   - `healthStatus`: "unknown"

**Manual Cleanup:**
1. Go to Settings
2. Select correct token type
3. Update expiration date if known
4. Worker will verify on next health check

---

## 📈 Expected Behavior

### **Normal Operation:**
- Health check runs every hour
- Status shows "healthy" in green
- No warnings or errors displayed
- Automations work correctly

### **Token Expiring (7 days):**
- Amber banner appears
- Message: "Token expires in X days"
- If refresh token present: Auto-refresh attempted at 3 days
- Manual update link provided

### **Token Expired:**
- Red banner appears
- Message: "Access token has expired"
- Automations stop working
- Manual update required
- Health restored after token update

---

## 🎯 Summary

You now have a production-ready token management system that:

✅ **Prevents Downtime** - Early warnings and automatic refresh  
✅ **Zero Maintenance** - Use System User tokens  
✅ **Proactive Monitoring** - Hourly health checks  
✅ **User-Friendly** - Visual notifications and easy fixes  
✅ **Production-Ready** - Enterprise-grade reliability  

**Recommended Setup for Production:**
1. Create Meta System User
2. Generate "Never Expires" token
3. Configure in CRM Settings
4. Set up monitoring on `/api/health/system`
5. Deploy with confidence! 🚀

---

## 📞 Need Help?

- Check health status: Visit Settings → WhatsApp tab
- View system health: GET `/api/health/system`
- Run manual health check: Restart worker
- Test token: Run `cd backend && node test-whatsapp-token.js`
