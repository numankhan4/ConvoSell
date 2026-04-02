# Inbox Troubleshooting Guide

## 🔍 Step-by-Step Diagnosis

### Step 1: Check if you're logged in
1. Open http://localhost:3004/dashboard/inbox
2. Are you logged in? (Should see your name/workspace)
3. If not → Go to http://localhost:3004/login

---

### Step 2: Check Database (Prisma Studio)

Open: http://localhost:5555

**Check these tables:**

| Table | What to Check | Expected |
|-------|---------------|----------|
| `conversations` | Row count | Should have 3 rows (from seed) |
| `contacts` | Row count | Should have 3 rows |
| `messages` | Row count | Should have 6+ rows |
| `whatsapp_integrations` | Row count | Should have 1 row |

**If all tables are EMPTY:**
- You deleted the seed data
- Run this to recreate it:
  ```powershell
  cd backend
  npx ts-node prisma/seed-inbox.ts
  ```

---

### Step 3: Test API in Browser Console

1. **Open DevTools** (Press F12) on the Inbox page
2. **Go to Console tab**
3. **Paste and run**:

```javascript
// Test conversations API
fetch('http://localhost:3000/api/crm/conversations', {
  headers: {
    'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('auth-storage')).state.token,
    'x-workspace-id': JSON.parse(localStorage.getItem('auth-storage')).state.currentWorkspace.id
  }
})
.then(r => r.json())
.then(d => {
  console.log('✅ API Response:', d);
  console.log('📊 Total conversations:', d.data?.length || 0);
  if (d.data?.length === 0) {
    console.error('❌ No conversations in database!');
  }
})
.catch(e => console.error('❌ API Error:', e));
```

**Expected Output:**
```json
✅ API Response: {
  "data": [
    { "id": "...", "contact": {...}, "lastMessagePreview": "..." },
    ...
  ],
  "total": 3,
  "page": 1
}
📊 Total conversations: 3
```

**If you see errors:**
- `401 Unauthorized` → You're not logged in
- `No conversations in database!` → Database is empty
- Network error → Backend not running

---

### Step 4: Check Browser Console Errors

In the Console tab, look for red errors like:
- ❌ `Failed to load conversations`
- ❌ `Network Error`
- ❌ `CORS Error`

---

### Step 5: Reseed Database (If Empty)

If database has no conversations:

```powershell
cd backend
npx ts-node prisma/seed-inbox.ts
```

Then refresh inbox page.

---

### Step 6: Check Frontend Network Tab

1. **Open DevTools** → **Network** tab
2. **Refresh inbox page**
3. **Look for request:** `conversations`
4. **Click on it** → Check:
   - Status: Should be `200 OK`
   - Response: Should have data array

---

##  Quick Fixes

### Fix 1: No Data in Database
```powershell
cd backend
npx ts-node prisma/seed-inbox.ts
```

### Fix 2: Not Logged In
- Go to http://localhost:3004/login
- Login with your account
- Go back to inbox

### Fix 3: Backend Not Running
```powershell
cd backend
npm run start:dev
```

### Fix 4: Frontend Not Running
```powershell
cd frontend
npm run dev
```

---

## ✅ Success Checklist

- [ ] Logged in (name shows in top right)
- [ ] Database has conversations (checked in Prisma Studio)
- [ ] API returns data (tested in browser console)
- [ ] No console errors (F12 → Console tab)
- [ ] Network request succeeds (F12 → Network tab)
- [ ] Inbox shows conversations

---

## 🆘 Still Not Working?

**Tell me:**
1. Are you logged in? (Yes/No)
2. How many rows in `conversations` table? (Check Prisma Studio)
3. What do you see in browser console? (Any errors?)
4. What does the API test command return? (Copy the output)

I'll help you fix it! 🚀
