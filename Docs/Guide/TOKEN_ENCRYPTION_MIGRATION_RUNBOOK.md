# Token Encryption Migration Runbook (Plaintext to Encrypted)

Last updated: 2026-04-08
Scope: WhatsApp and Shopify credential/token fields
Mode: Zero-cost, safe rollout

## Goal
Migrate legacy plaintext secrets to encrypted values without downtime or data loss.

## Preconditions
1. Application version with encrypt-on-write and decrypt-with-plaintext-fallback is deployed.
2. WHATSAPP_CRM_ENCRYPTION_KEY is configured in target environment.
3. Database backup exists before migration starts.

## Target Fields
- whatsAppIntegrations.accessToken
- whatsAppIntegrations.refreshToken
- shopifyStores.clientSecret
- shopifyStores.accessToken
- shopifyStores.oauthAccessToken

## Migration Strategy
Use rolling migration with compatibility mode:
1. Read value.
2. If already encrypted prefix (enc:v1:), skip.
3. If plaintext, rewrite same record through application encryption utility.

## Execution Steps
1. Deploy app version with encryption helper and compatibility read path.
2. Confirm key is present in environment.
3. Run migration script/job in small batches.
4. Monitor logs for decrypt failures and API auth errors.
5. Verify sample records are now encrypted.
6. Keep compatibility mode enabled for at least one release cycle.

## Verification Checklist
1. New writes are encrypted.
2. Legacy records were converted.
3. WhatsApp send and template flows still work.
4. Shopify API operations still work.
5. Health checks continue to pass.

## Rollback Plan
1. If failures occur, pause migration job immediately.
2. Keep compatibility read path enabled (supports plaintext).
3. Restore from backup only if data corruption occurs.
4. Fix key/config issues and re-run batch from last safe checkpoint.

## Failure Patterns and Actions
1. Error: decryption key missing
- Action: set WHATSAPP_CRM_ENCRYPTION_KEY and restart service.

2. Error: invalid encrypted secret payload
- Action: isolate record, restore from backup snapshot or source secret, re-encrypt.

3. API auth failures after migration
- Action: verify decrypted value equals original token; refresh token if expired.

## Evidence to Keep
- Migration start/end timestamps
- Number of records updated per table
- Failure count and remediation notes
- Post-migration validation checklist results
