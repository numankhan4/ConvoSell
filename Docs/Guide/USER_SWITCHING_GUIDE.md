# User Switching & Permission Management Guide

## 🎯 Overview

This document explains the new **User Switching** and **Permission Management** features that enable easy testing of role-based access control (RBAC) in your WhatsApp CRM application.

---

## ✨ Features Added

### 1. **User Impersonation System**
   - Switch between test users instantly from the dashboard
   - No need to logout/login repeatedly
   - Visual indicators when impersonating
   - Easy return to original account

### 2. **Permission Management Screen**
   - Visual matrix showing all roles and permissions
   - Filter by specific roles
   - Color-coded permission indicators
   - Comprehensive permission documentation

### 3. **Configurable Access**
   - Owner can grant/revoke impersonation rights
   - New permissions: `users:impersonate` and `users:view_all`
   - Default: Only owner has these permissions

---

## 🚀 How to Use

### **Access User Switcher**

1. **Login as Owner**
   - Email: `owner@test.com`
   - Password: `test123`

2. **Locate User Switcher**
   - Look for the purple "Switch User" button in the left sidebar
   - Located above the logout button
   - Visible only if you have `users:impersonate` permission

3. **Switch to Another User**
   - Click the "Switch User" button
   - Select any test user from the dropdown
   - Roles available:
     - 🟣 **Owner** - Full control
     - 🔵 **Admin** - Full control except billing
     - 🟢 **Manager** - Team & operations management
     - 🟠 **Agent** - Customer-facing operations
     - ⚪ **Viewer** - Read-only access

4. **Impersonation Indicators**
   - Button changes to orange "Impersonating"
   - Top banner shows: "Viewing as: [Name] ([Role])"
   - Dashboard reflects selected user's permissions

5. **Return to Your Account**
   - Click "Switch User" button again
   - Click "Return to your account" in the orange section
   - Or use the button in the top orange banner

---

## 🛡️ Permission Management Screen

### **Access the Screen**

1. Navigate to: **Dashboard → Settings → Permissions**
2. Or directly: `http://localhost:3004/dashboard/settings/permissions`

### **Features**

#### **Role Summary Cards**
- Shows all 5 roles with permission coverage percentage
- Click any role card to filter permissions for that role
- See which role you currently have

#### **Permission Matrix**
- Organized by category (11 categories total):
  - Workspace Management
  - Team Management
  - Integrations
  - Contacts
  - Conversations
  - Orders
  - Automations
  - Templates
  - Analytics
  - Settings
  - Testing & Development

- **Click category headers** to expand/collapse
- Each permission shows:
  - Permission key (e.g., `orders:confirm`)
  - Friendly label
  - Description
  - Which roles have access (✅ green = has access, ❌ gray = no access)

---

## 📋 Testing Checklist

Use this checklist to verify RBAC is working correctly:

### **1. Test as Owner**

- [ ] Can see "Switch User" button
- [ ] Can access Permission Management screen
- [ ] Can switch to admin, manager, agent, viewer
- [ ] Can see revenue in dashboard
- [ ] Can delete data in Settings → Data
- [ ] Can connect/disconnect integrations
- [ ] Can create/delete contacts, automations, templates
- [ ] Can confirm orders
- [ ] Can send messages

### **2. Test as Admin** (switch to admin@test.com)

- [ ] Can see all features except:
  - [ ] Cannot see "Switch User" (no impersonation rights)
  - [ ] Cannot delete workspace
  - [ ] Cannot access billing
- [ ] Can manage team, integrations, contacts, orders
- [ ] Can see revenue analytics
- [ ] Role badge shows "ADMIN" in blue

### **3. Test as Manager** (switch to manager@test.com)

- [ ] Can see limited features:
  - [ ] Can view and confirm orders
  - [ ] Can see revenue analytics
  - [ ] Can manage conversations
  - [ ] Can view contacts
- [ ] Cannot create automations or templates
- [ ] Cannot connect/disconnect integrations
- [ ] Role badge shows "MANAGER" in green

### **4. Test as Agent** (switch to agent@test.com)

- [ ] Very limited access:
  - [ ] Can view and send messages in Inbox
  - [ ] Can view orders (cannot confirm)
  - [ ] Can view contacts (cannot create/delete)
  - [ ] Can view automations (cannot edit)
- [ ] Cannot see revenue (shows ••••••)
- [ ] Cannot access settings
- [ ] Role badge shows "AGENT" in orange

### **5. Test as Viewer** (switch to viewer@test.com)

- [ ] Read-only everywhere:
  - [ ] Can view inbox (cannot send messages)
  - [ ] Can view orders (no action buttons)
  - [ ] Can view contacts (no create/delete)
  - [ ] Can view dashboard (revenue hidden)
- [ ] No create/edit/delete buttons visible
- [ ] Role badge shows "VIEWER" in gray

---

## 🔧 Grant Impersonation to Other Roles

Currently, only the Owner has impersonation rights. To grant this to other roles:

### **Option 1: Modify Backend (Temporary Testing)**

Edit: `backend/src/common/constants/permissions.constants.ts`

```typescript
[WorkspaceRole.ADMIN]: [
  // ... existing permissions
  Permission.USERS_IMPERSONATE,  // Add this line
  Permission.USERS_VIEW_ALL,      // Add this line
],
```

### **Option 2: Create Custom Permission System** (Future Enhancement)

Would require:
1. Database table for custom role permissions
2. UI to toggle permissions per role
3. Backend service to merge default + custom permissions
4. Permission override system

---

## 🎨 UI/UX Features

### **Modern SaaS Design**
- ✅ Purple gradient theme for permission features
- ✅ Role-based color coding (purple, blue, green, orange, gray)
- ✅ Sticky navigation in settings
- ✅ Responsive layout (mobile-friendly)
- ✅ Smooth transitions and hover states
- ✅ Icons from Lucide React library
- ✅ Clear visual hierarchy

### **User Experience**
- ✅ One-click user switching
- ✅ Persistent impersonation state (survives page refresh)
- ✅ Clear impersonation indicators
- ✅ Easy return to original account
- ✅ Permission tooltips and descriptions
- ✅ Filterable permission matrix
- ✅ Collapsible categories for better organization

---

## 🔒 Security Notes

### **Important: Development/Testing Only**

⚠️ **WARNING**: User impersonation is intended for **testing and development only**. 

In production:
- Remove or strictly limit impersonation permissions
- Implement audit logging for impersonation events
- Add additional authentication for sensitive actions
- Consider IP whitelisting for impersonation feature

### **Current Security Measures**
- Permission-based access control (only owner by default)
- JWT token includes impersonation flag
- Original user ID stored in token for accountability
- Backend validation of impersonation requests
- Workspace-scoped user switching

---

## 🐛 Troubleshooting

### **"Switch User" button not visible**
- ✅ Ensure you're logged in as Owner
- ✅ Check that permissions constants are up to date
- ✅ Verify backend has `USERS_IMPERSONATE` permission

### **Cannot switch users**
- ✅ Check console for API errors
- ✅ Verify backend is running
- ✅ Ensure all test users exist (run `node create-test-users.js`)

### **Permissions not updating after switch**
- ✅ Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- ✅ Check Network tab for `/workspace/members/me` response
- ✅ Verify workspace ID is correct

### **Permission Management screen shows no permissions**
- ✅ Ensure you have `users:view_all` permission
- ✅ Check that PERMISSIONS_BY_CATEGORY is populated
- ✅ Verify ROLE_PERMISSIONS mapping is correct

---

## 📊 API Endpoints Added

### **POST** `/api/auth/impersonate/:userId`
**Description**: Impersonate another user in the workspace

**Headers**:
```json
{
  "Authorization": "Bearer <token>",
  "x-workspace-id": "<workspaceId>"
}
```

**Response**:
```json
{
  "user": { ... },
  "role": "admin",
  "accessToken": "<new_token>",
  "isImpersonating": true,
  "originalUserId": "<original_user_id>"
}
```

---

### **POST** `/api/auth/stop-impersonation`
**Description**: Return to original user account

**Headers**:
```json
{
  "Authorization": "Bearer <token>",
  "x-workspace-id": "<workspaceId>"
}
```

**Response**:
```json
{
  "user": { ... },
  "role": "owner",
  "accessToken": "<original_token>",
  "isImpersonating": false
}
```

---

### **GET** `/api/auth/workspace-users`
**Description**: Get all users in current workspace

**Headers**:
```json
{
  "Authorization": "Bearer <token>",
  "x-workspace-id": "<workspaceId>"
}
```

**Response**:
```json
[
  {
    "id": "user_id",
    "email": "owner@test.com",
    "firstName": "Test",
    "lastName": "Owner",
    "role": "owner",
    "workspaceMemberId": "member_id"
  },
  ...
]
```

---

## 🎓 Best Practices

### **For Testing**
1. Always start as Owner
2. Test each role systematically (owner → admin → manager → agent → viewer)
3. Verify both that allowed features work AND restricted features are hidden
4. Check mobile responsiveness
5. Test edge cases (expired sessions, invalid users, etc.)

### **For Development**
1. Keep permission constants in sync between frontend and backend
2. Use TypeScript for type safety
3. Add proper error handling for all API calls
4. Log impersonation events for debugging
5. Test with different workspace configurations

### **For Documentation**
1. Update this guide when adding new permissions
2. Document any custom permission modifications
3. Keep API documentation current
4. Add screenshots for visual features

---

## 📝 Files Modified/Created

### **Backend**
- `src/common/constants/permissions.constants.ts` - Added USERS_IMPERSONATE & USERS_VIEW_ALL
- `src/auth/auth.controller.ts` - Added impersonation endpoints
- `src/auth/auth.service.ts` - Added impersonation logic

### **Frontend**
- `lib/store/auth.ts` - Added impersonation state & methods
- `components/UserSwitcher.tsx` - User switching dropdown component
- `components/SettingsNav.tsx` - Settings navigation component
- `app/dashboard/layout.tsx` - Added UserSwitcher & impersonation banner
- `app/dashboard/settings/layout.tsx` - Settings layout wrapper
- `app/dashboard/settings/permissions/page.tsx` - Permission management screen

---

## 💡 Future Enhancements

Potential improvements:
1. **Custom Permission Editor**: Database-backed permission overrides per role
2. **Audit Logs**: Track all impersonation events with timestamps
3. **Session Recording**: Record actions taken while impersonating
4. **Time-Limited Impersonation**: Auto-expire after X minutes
5. **Bulk Permission Testing**: Test all features automatically
6. **Permission Search**: Search/filter permissions by keyword
7. **Export Permission Report**: Download CSV/PDF of role permissions
8. **Team Member Impersonation**: Switch to actual team members (not just test users)

---

## ❓ Need Help?

If you encounter issues or need clarification:
1. Check browser console for errors
2. Review backend logs for API errors
3. Verify database has all test users
4. Ensure frontend and backend are both running
5. Check that all dependencies are installed (`npm install`)

Happy Testing! 🚀
