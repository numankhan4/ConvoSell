# Shopify Order Re-Sync Guide

## Purpose

Use this guide when a Shopify webhook was missed and a single order in CRM needs to be refreshed from Shopify.

This recovery updates local CRM records for that order by pulling latest Shopify data and re-running the normal sync logic.

## What is available

1. Admin API endpoint for one-off re-sync
2. CLI script for terminal-based recovery

## Admin API Endpoint

Route:

POST /api/shopify/admin/resync-order

Authorization:

- Requires authenticated workspace user
- Allowed roles: owner, admin

Request body:

{
  "externalOrderId": "1234567890"
}

Response shape:

{
  "success": true,
  "message": "Order 1234567890 re-synced successfully",
  "result": {
    "externalOrderId": "1234567890",
    "localOrderId": "cm...",
    "status": "pending",
    "syncedAt": "2026-04-07T17:25:00.000Z"
  }
}

## CLI Script

Command:

npm run shopify:resync-order -- <workspaceId> <externalOrderId>

Example:

npm run shopify:resync-order -- cmndiib400002phbc5ymhv5fp 1234567890

## What gets synced

The re-sync fetches one Shopify order by ID and applies existing update logic in CRM. This includes:

- Order totals and line items
- Shipping address
- Order status mapping
- Contact sync from order payload (name, email, phone)
- Order-contact link updates when needed

## What re-sync does not do

- It does not re-send automation messages for old orders automatically
- It does not create a new order-created outbox event for already existing orders

If you need to send confirmation manually for a previously missed order, run automation manually from Orders UI or automation execute endpoint.

## When to use

Use this tool when you notice mismatch between Shopify and CRM, for example:

- Order edited in Shopify but CRM did not update
- Customer phone changed in Shopify but CRM contact still old
- Past webhook outage and some orders are stale

## Quick operational checklist

1. Confirm Shopify store is connected and active
2. Ensure backend is running
3. Run endpoint or script with correct Shopify order ID
4. Verify in CRM Orders page
5. Verify Inbox/contact reflects updated phone and contact details

## Troubleshooting

If re-sync fails:

1. Check order ID is Shopify numeric order ID, not order name like #1009
2. Check API token availability for store (OAuth or legacy token)
3. Check backend logs for Shopify API error response
4. Confirm order still exists in Shopify

## Related files

- backend/src/shopify/shopify.controller.ts
- backend/src/shopify/shopify.service.ts
- backend/src/scripts/resync-shopify-order.ts
- backend/package.json
