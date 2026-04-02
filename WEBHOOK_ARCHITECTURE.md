# Webhook Verify Token - Architecture Note

## Issue Discovered
The Settings page had a "Webhook Verify Token" field, but the value was **never used**. The webhook controller always reads from the environment variable `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

## Current Implementation (Fixed)

### How It Works
1. **Webhook verification** uses environment variable: `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
2. **Settings page** no longer shows the field (removed from UI)
3. **Database field** made optional (backwards compatibility)
4. **Single global token** for all workspaces

### Configuration
Set in `backend/.env`:
```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your-secure-random-token"
```

**Important:** 
- This token must match what you configure in Meta Business Manager webhook settings
- It's a **system-wide setting**, not per-workspace
- All workspaces share the same webhook endpoint and verification token

## Why This Design?

### Current Approach: Global Token ✅ (Simpler)
**Pros:**
- Simple configuration
- One webhook URL for entire application
- Easy to manage

**Cons:**
- All workspaces share same webhook endpoint
- Less isolation between tenants
- Single point of failure

### Alternative: Per-Workspace Tokens (Better for Multi-Tenant)
**How it could work:**
```
Webhook URL: https://api.example.com/api/whatsapp/webhook/:workspaceId
Each workspace has unique verify token stored in database
```

**Pros:**
- Better tenant isolation
- Can disable webhooks per workspace
- More secure

**Cons:**
- More complex setup (need separate Meta app per workspace OR dynamic webhook registration)
- Harder to configure
- Meta might require app review for multiple webhooks

## Migration Path (If Needed)

If you want per-workspace verification in the future:

### Option 1: Workspace ID in URL
```typescript
// backend/src/whatsapp/whatsapp.controller.ts
@Get('webhook/:workspaceId')
async verifyWebhook(
  @Param('workspaceId') workspaceId: string,
  @Query('hub.verify_token') token: string,
) {
  const integration = await this.prisma.whatsAppIntegration.findFirst({
    where: { workspaceId },
  });
  
  if (token === integration.webhookVerifyToken) {
    // verified
  }
}
```

**Webhook URL per workspace:**
```
https://api.example.com/api/whatsapp/webhook/workspace-id-123
```

### Option 2: Token Lookup from Meta Phone Number ID
```typescript
// Use incoming message to identify workspace
const phoneNumberId = value.metadata.phone_number_id;
const integration = await this.prisma.whatsAppIntegration.findUnique({
  where: { phoneNumberId },
});
```

This is what we currently do for incoming messages, but verification happens before any webhook data comes in.

## Recommendation

**For now:** Keep the current global token approach. It's:
- ✅ Simpler to configure
- ✅ Works for most use cases
- ✅ Easy to understand
- ✅ Sufficient for small-medium deployments

**For large multi-tenant SaaS:** Consider Option 1 (workspace ID in URL) when you have:
- 100+ workspaces
- Need strict tenant isolation
- Compliance requirements
- Budget for multiple Meta apps OR can handle dynamic webhook registration

## Files Modified

1. **Frontend:**
   - `frontend/app/dashboard/settings/page.tsx` - Removed field, added explanation

2. **Backend:**
   - `backend/src/settings/dto/whatsapp-integration.dto.ts` - Made field optional
   - `backend/src/settings/settings.service.ts` - Default value if not provided
   - `backend/src/whatsapp/whatsapp.controller.ts` - Added clarifying comment

3. **Documentation:**
   - This file (`WEBHOOK_ARCHITECTURE.md`)

## User Impact

✅ **No breaking changes** - Existing integrations continue to work  
✅ **Clearer UI** - No more confusing unused field  
✅ **Better docs** - Users understand it's a system setting  
✅ **Future-proof** - Database field kept for potential migration  

## Configuration Checklist

When setting up WhatsApp webhooks:

1. ✅ Set `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env`
2. ✅ Use same token in Meta webhook configuration
3. ✅ Webhook URL: `https://your-domain.com/api/whatsapp/webhook`
4. ✅ Subscribe to: `messages`, `message_status`
5. ✅ Enter credentials in Settings (Access Token, Phone Number ID, etc.)

The verify token field is no longer shown in the UI - it's automatically handled from the environment variable.
