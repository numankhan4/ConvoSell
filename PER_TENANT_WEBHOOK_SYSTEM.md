# Per-Tenant Webhook System

## Overview

This system implements **workspace-specific webhook URLs and verify tokens** for better security isolation in a multi-tenant SaaS architecture.

## Architecture

### Before (Global Webhook)
- ❌ Single webhook URL for all tenants: `/api/whatsapp/webhook`
- ❌ Shared verify token from `WHATSAPP_WEBHOOK_VERIFY_TOKEN` env variable
- ⚠️  Security risk: One leaked token affects all tenants
- ⚠️  No audit trail: Can't track which tenant configured webhook

### After (Per-Tenant Webhooks)
- ✅ Unique URL per workspace: `/api/whatsapp/webhook/:workspaceId`
- ✅ Unique verify token per workspace (stored in database)
- ✅ Better security isolation: Token leak = 1 tenant, not all
- ✅ Audit trail: Know which tenant owns which webhook
- ✅ Flexibility: Each tenant can use different infrastructure if needed

## How It Works

### 1. Webhook Token Generation

When a WhatsApp integration is created:

```typescript
// backend/src/settings/settings.service.ts
const webhookVerifyToken = generateWebhookVerifyToken(); // Format: whv_<48_hex_chars>

await prisma.whatsAppIntegration.create({
  data: {
    workspaceId,
    webhookVerifyToken, // Unique per workspace
    // ... other fields
  }
});
```

### 2. Webhook Verification Flow

When Meta sends verification request:

```http
GET /api/whatsapp/webhook/:workspaceId?hub.mode=subscribe&hub.verify_token=whv_xxx&hub.challenge=yyy
```

Backend controller:

```typescript
// 1. Extract workspaceId from URL parameter
// 2. Find workspace's WhatsApp integration in database
// 3. Compare hub.verify_token with integration.webhookVerifyToken
// 4. Return challenge if tokens match
```

### 3. Data Isolation

Even with per-tenant webhooks, tenant identification happens via `phone_number_id`:

```typescript
// When webhook event arrives
const integration = await prisma.whatsAppIntegration.findUnique({
  where: { phoneNumberId: metadata.phone_number_id }
});

// All messages/contacts created with integration.workspaceId
```

This **double verification** ensures:
1. Webhook verification uses workspace-specific token (security)
2. Message routing uses phone_number_id (data isolation)

## API Reference

### Get Webhook Configuration

```http
GET /api/settings/webhook-urls
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "whatsapp": {
    "callbackUrl": "https://your-domain.com/api/whatsapp/webhook/cle123xyz",
    "verifyToken": "whv_a1b2c3d4e5f6...",
    "securityNote": "Each workspace has a unique webhook URL and token for better security isolation.",
    "legacyCallbackUrl": "https://your-domain.com/api/whatsapp/webhook",
    "legacyVerifyToken": "mySecureWebhookToken2024"
  }
}
```

## Frontend Implementation

### Display Workspace-Specific URL

```typescript
// Load webhook config on mount
const [webhookConfig, setWebhookConfig] = useState(null);

useEffect(() => {
  const loadWebhookConfig = async () => {
    const data = await settingsApi.getWebhookUrls(token);
    setWebhookConfig(data);
  };
  loadWebhookConfig();
}, []);

// Display in UI
<code>{webhookConfig?.whatsapp?.callbackUrl || 'Loading...'}</code>
<code>{webhookConfig?.whatsapp?.verifyToken || 'Loading...'}</code>
```

### Copy to Clipboard

```typescript
<button onClick={() => {
  navigator.clipboard.writeText(webhookConfig.whatsapp.callbackUrl);
  toast.success('Webhook URL copied!');
}}>
  Copy URL
</button>
```

## 🔐 Security Benefits

| Aspect | Global Token | Per-Tenant Token |
|--------|-------------|------------------|
| **Token Leak Impact** | ❌ All tenants affected | ✅ One tenant only |
| **Data Isolation** | ✅ Safe (via phone_number_id) | ✅ Safe (via phone_number_id) |
| **Audit Trail** | ❌ No ownership tracking | ✅ Clear ownership |
| **Operational Flexibility** | ❌ All use same URL | ✅ Custom URLs possible |
| **Compliance** | ⚠️  Shared secret | ✅ Isolated secrets |

## Migration Guide

### For Existing Deployments

**Step 1: Run Migration Script**

```bash
cd backend
npx ts-node src/scripts/migrate-webhook-tokens.ts
```

This will:
- Find all integrations with placeholder tokens (`not-used-see-env`)
- Generate unique tokens for each (`whv_...`)
- Update database records
- Print summary of changes

**Step 2: Update Environment Variables**

The global `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is now optional (kept for legacy support).

**Step 3: Notify Users**

Send notification to all workspace owners:

> **Action Required: Update WhatsApp Webhook Configuration**
> 
> We've upgraded our webhook  system for better security. Each workspace now has a unique webhook URL and token.
> 
> 1. Go to Settings → WhatsApp → Webhook Configuration
> 2. Copy your new webhook URL and token
> 3. Update them in Meta App Dashboard → WhatsApp → Configuration → Webhook
> 
> Your old webhook will continue working for 30 days.

**Step 4: Deprecation Timeline**

- **Week 1**: Migration runs, users notified
- **Week 2-4**: Both endpoints work (grace period)
- **Week 5**: Disable global endpoint
- **Week 6**: Remove global endpoint code

## Testing

### Manual Test

1. **Create Integration**
   ```bash
   POST /api/settings/whatsapp
   {
     "phoneNumberId": "123456789",
     "phoneNumber": "+1234567890",
     "businessAccountId": "987654321",
     "accessToken": "EAAxx...",
     "tokenType": "system-user"
   }
   ```

2. **Get Webhook Config**
   ```bash
   GET /api/settings/webhook-urls
   ```
   
   Verify response includes:
   - `callbackUrl` with `/:workspaceId`
   - `verifyToken` starting with `whv_`

3. **Test Verification**
   ```bash
   GET /api/whatsapp/webhook/:workspaceId?hub.mode=subscribe&hub.verify_token=whv_xxx&hub.challenge=test123
   ```
   
   Should return: `test123` (the challenge)

4. **Test Invalid Token**
   ```bash
   GET /api/whatsapp/webhook/:workspaceId?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test123
   ```
   
   Should return: `403 Forbidden`

### Automated Tests

```typescript
describe('Per-Tenant Webhooks', () => {
  it('should generate unique token on integration creation', async () => {
    const integration = await createIntegration(...);
    expect(integration.webhookVerifyToken).toMatch(/^whv_[a-f0-9]{48}$/);
  });

  it('should verify webhook with correct token', async () => {
    const response = await request(app)
      .get(`/api/whatsapp/webhook/${workspaceId}`)
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': integration.webhookVerifyToken,
        'hub.challenge': 'test123',
      });
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('test123');
  });

  it('should reject webhook with invalid token', async () => {
    const response = await request(app)
      .get(`/api/whatsapp/webhook/${workspaceId}`)
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'invalid',
        'hub.challenge': 'test123',
      });
    
    expect(response.status).toBe(403);
  });

  it('should reject webhook for nonexistent workspace', async () => {
    const response = await request(app)
      .get('/api/whatsapp/webhook/nonexistent')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'anything',
        'hub.challenge': 'test123',
      });
    
    expect(response.status).toBe(404);
  });
});
```

## FAQ

### Q: Why not just use different verify tokens without changing the URL?

**A:** Meta's webhook verification request doesn't include any tenant identifier. The URL `/:workspaceId` parameter is how we know which workspace's token to validate against.

### Q: Can I still use the global webhook endpoint?

**A:** Yes, for backward compatibility. But it's deprecated and will be removed in a future version. The global endpoint uses the env variable `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

### Q: What happens if I don't migrate?

**A:** New integrations automatically get unique tokens. Existing integrations with `not-used-see-env` will continue using the global endpoint until you run the migration.

### Q: How secure are the generated tokens?

**A:** Tokens use `crypto.randomBytes(24)` which provides 192 bits of entropy (48 hex characters). This is cryptographically secure and equivalent to strong password generation.

### Q: Will this affect message routing or data isolation?

**A:** No. Message routing still uses `phone_number_id` to identify the workspace. The webhook token only affects the initial verification handshake with Meta.

### Q: Can tenants change their webhook token?

**A:** Currently no. Tokens are auto-generated and stored in the database. If needed, you could add a regeneration endpoint in the future.

## Troubleshooting

### Issue: "Webhook verification failed"

**Cause:** Token mismatch between database and Meta configuration

**Solution:**
1. Check current token: `GET /api/settings/webhook-urls`
2. Update Meta Dashboard with the correct token
3. Or regenerate integration (delete and recreate)

### Issue: "Workspace not found or integration not active"

**Cause:** Integration doesn't exist or `isActive = false`

**Solution:**
1. Check integration exists: `GET /api/settings/whatsapp`
2. Verify `isActive = true` in database
3. Use correct workspaceId in URL

### Issue: "Legacy endpoint still being used"

**Cause:** Users haven't updated Meta configuration yet

**Solution:**
1. Check server logs for deprecated endpoint warnings
2. Notify affected users to update webhook URL
3. After grace period, disable legacy endpoint

## Implementation Files

### Backend
- `backend/src/common/utils/crypto.util.ts` - Token generation utilities
- `backend/src/whatsapp/whatsapp.controller.ts` - Webhook endpoints (GET/POST)
- `backend/src/settings/settings.service.ts` - Integration creation & webhook config
- `backend/src/scripts/migrate-webhook-tokens.ts` - Migration script
- `backend/prisma/schema.prisma` - Database schema (webhookVerifyToken field)

### Frontend
- `frontend/app/dashboard/settings/page.tsx` - Webhook configuration UI
- `frontend/lib/api/settings.ts` - API client (getWebhookUrls)

## Rollback Plan

If issues occur during migration:

1. **Immediate Rollback** (< 1 hour):
   - Revert backend deployment
   - Global endpoint still works
   - No data loss

2. **Partial Rollback** (within grace period):
   - Keep per-tenant endpoints active
   - Re-enable global endpoint
   - Give users more time to migrate

3. **Database Rollback**:
   ```sql
   UPDATE whatsapp_integrations 
   SET webhook_verify_token = 'not-used-see-env' 
   WHERE webhook_verify_token LIKE 'whv_%';
   ```

## Future Enhancements

- [ ] Add token regeneration endpoint
- [ ] Add webhook health monitoring per tenant
- [ ] Track webhook delivery success rates
- [ ] Auto-detect and notify when webhook config is wrong
- [ ] Add webhook event replay for failed deliveries
- [ ] Support webhook authentication beyond just verify token (HMAC, JWT)
