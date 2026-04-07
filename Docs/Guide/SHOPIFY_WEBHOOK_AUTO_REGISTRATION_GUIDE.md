# Shopify Webhook Auto-Registration and Self-Healing Guide

## What this implementation does

The backend now automatically manages Shopify webhook subscriptions during OAuth install/reconnect.

Implemented behavior:

1. After successful OAuth callback, backend calls webhook registration automatically.
2. Required topics are enforced on every run:
   - `ORDERS_CREATE`
   - `ORDERS_UPDATED`
   - `ORDERS_CANCELLED`
   - `ORDERS_DELETE`
   - `ORDERS_FULFILLED`
3. Self-healing logic:
   - Keeps existing valid subscription if topic + callback URL already match.
   - Removes duplicate valid subscriptions for same topic.
   - Removes old/wrong-url subscriptions for the required topics.
   - Recreates missing or repaired subscriptions.
4. Manual re-run remains available via existing endpoint:
   - `POST /api/settings/shopify/webhooks/register`

## Why this is needed

Manual webhook setup in Shopify Admin is error-prone:

1. Merchants may miss topics.
2. Callback URLs drift when ngrok/domain changes.
3. Duplicate subscriptions can cause duplicate processing.

App-managed webhook subscriptions are the current best-practice approach for reliable production behavior.

## Important limitation: 403 protected customer data errors

Webhook configuration does not fix this permission error by itself:

`[API] This app is not approved to access REST endpoints with protected customer data`

If this appears, configure Shopify Partner Dashboard access and re-authorize app token.

## Required Shopify access setup (merchant/app owner)

1. In Partner Dashboard, request Protected customer data access.
2. Request required protected fields used by your app:
   - Name
   - Address
   - Email
   - Phone
3. Ensure OAuth scopes include:
   - `read_orders`
   - `write_orders`
   - `read_customers`
   - `write_customers`
   - `read_all_orders` (recommended)
4. Reinstall/reconnect app to generate token with updated permissions.

## Test checklist

Run this after deployment/restart:

1. Connect or reconnect Shopify via OAuth.
2. Confirm backend logs mention webhook registration and/or already_configured statuses.
3. Run manual register endpoint once to verify idempotency.
4. Verify Shopify subscriptions include all required topics pointing to:
   - `/api/shopify/webhook`
5. Create/update/cancel/delete/fulfill test orders in Shopify and verify CRM sync.

## Files changed for this solution

1. `backend/src/settings/settings.service.ts`
   - Upgraded `registerShopifyWebhooks` to self-healing ensure-flow.
2. `backend/src/shopify/oauth/shopify-oauth.controller.ts`
   - Calls webhook registration after successful OAuth token exchange.
3. `backend/src/shopify/oauth/shopify-oauth.module.ts`
   - Imports `SettingsModule` to use `SettingsService` in OAuth controller.

## Operational recommendation

Keep both:

1. Auto-registration in OAuth flow (default path).
2. Manual registration endpoint for support and emergency repair.

This gives the best reliability and fastest support recovery.
