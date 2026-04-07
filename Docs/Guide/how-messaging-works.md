# Messaging System Guide

This document explains how messaging currently works in this project, including:

- Message delivery paths (manual and automation)
- Text vs template messaging behavior
- Plan/quota logic (free vs paid)
- 24-hour window behavior
- Automation action formats (including new template action support)
- Data tracking and troubleshooting

This guide reflects the current implementation in backend and worker.

## 1. High-level architecture

Messaging has two execution paths:

1. Direct/API path (backend service)
2. Async automation path (outbox -> BullMQ worker)

Core components:

- `backend/src/whatsapp/whatsapp.service.ts`
	- Sends WhatsApp Cloud API requests
	- Supports `text`, `interactive` (buttons), and `template` messages
	- Handles managed template quotas and template usage tracking
- `backend/src/automations/automations.service.ts`
	- Manual automation execution
	- Shared action dispatch logic
	- Supports template-based automation actions via `templateId`
- `backend/src/shopify/shopify.service.ts`
	- Creates `order.created` outbox events for new Shopify orders
- `backend/src/jobs/jobs.service.ts`
	- Polls `outbox_events` and enqueues jobs to queue `outbox`
- `worker/src/processors/order-processor.ts`
	- Consumes `process-order-event` jobs
	- Executes automation actions in background (including template actions)

## 2. Message types in system

The system can send three WhatsApp payload types:

- Text (`type: text`)
- Interactive buttons (`type: interactive`, button replies)
- Template (`type: template`, Meta-approved template)

### 2.1 Text and button messages

Used by classic `send_message` automation action when no `templateId` is provided.

Supported placeholders in message text:

- `{{customer_name}}`
- `{{order_number}}`
- `{{order_total}}`

When `useButtons` is true, message is sent as interactive buttons with:

- `confirm_<orderId>`
- `cancel_<orderId>`

### 2.2 Template messages (Meta approved)

Template messages are sent using `sendManagedTemplateMessage`.

Requirements:

- Template exists in `whatsapp_message_templates`
- Template belongs to workspace
- Template status is `APPROVED`
- Subscription is active/trialing
- Plan/quota allows template sends

Tracking is stored in `template_messages` and usage counters are updated on workspace/template.

## 3. Automation action formats

Automation actions are JSON in `automation.actions`.

### 3.1 Legacy/simple text action

```json
{
	"type": "send_message",
	"config": {
		"message": "Thank you for your order!"
	}
}
```

Also supports top-level `message`/`template` fields for backward compatibility.

### 3.2 Template-based automation action (new)

Supported action types:

- `send_template_message`
- `send_template`
- `send_message` with `templateId`

Example:

```json
{
	"type": "send_template_message",
	"config": {
		"templateId": "cmx_template_123",
		"headerParams": ["{{customer_name}}"],
		"bodyParams": [
			"{{customer_name}}",
			"{{order_number}}",
			"{{order_total}}"
		],
		"buttonParams": []
	}
}
```

Supported variable rendering tokens for params:

- `{{customer_name}}`
- `{{order_number}}`
- `{{order_total}}`
- `{{payment_method}}`

Notes:

- Action fields can be in top-level action or inside `config`.
- If `templateId` exists, template flow is selected automatically.

## 4. Shopify order -> automatic message flow

For newly created Shopify orders:

1. `shopify.service` creates/updates order.
2. For new orders, it creates outbox event:
	 - `eventType: order.created`
	 - payload includes `workspaceId`, `orderId`, `contactId`, `paymentMethod`
3. `jobs.service` polls pending outbox rows and enqueues queue job `process-order-event`.
4. Worker processes job in `order-processor.ts`.
5. Worker loads active automations for workspace and matching trigger.
6. Worker executes each action:
	 - text/button flow, or
	 - template flow if `templateId` is configured
7. On send success, order `confirmationSentAt` is updated.

## 5. Free vs paid behavior

Plan behavior is defined in `subscription.constants.ts` and used by template sending logic.

### 5.1 Free plan

- `templateMessagesLimit = 0`
- `canSendTemplateMessage` returns blocked for template sends
- Free workspace can still send normal session text/interactives (subject to WhatsApp policy/API behavior)

### 5.2 Paid plans

- Starter/Pro/Business have monthly template quotas
- Enterprise is unlimited (`-1` limit)
- Template sends increment `workspace.templateMessagesUsed`
- Quota resets monthly at `quotaResetAt`

### 5.3 Subscription status checks

Managed template flow requires subscription status:

- `active` or `trialing`

If not active/trialing, template send is blocked.

## 6. 24-hour window behavior

Important distinction:

- WhatsApp policy allows free-form/session messaging only inside customer service window.
- Business-initiated outbound outside that window should use approved templates.

Current implementation behavior:

- Template flow is explicitly policy-aligned and quota-managed.
- Classic text automation path does not perform a strict local 24-hour window check before API call.
- In practice, policy enforcement can occur at Meta API level when messages are submitted.

Recommended operational rule:

- Use template-based automation for order creation confirmations to be policy-safe and plan-governed.

## 7. Data tracking tables and fields

Primary records:

- `messages`
	- Stores regular outbound/inbound conversation messages
	- Includes text/interactive history
- `template_messages`
	- Stores template send attempts and outcomes
	- Includes params, status, error, estimated cost
- `workspaces.templateMessagesUsed`
	- Running monthly template usage counter
- `whatsapp_message_templates.sentCount`
	- Per-template send stats
- `orders.confirmationSentAt`
	- Marker that confirmation was sent

## 8. Why a simple message was sent previously

If automation action is:

```json
{
	"type": "send_message",
	"config": { "message": "Thank you for your order!" }
}
```

then that exact message is expected.

To send rich order details using Meta templates, action must include `templateId` and params.

## 9. Backward compatibility and migration notes

Backwards compatible behavior:

- Existing `send_message` actions continue to work.
- Legacy action field shapes are still supported.

Template upgrade path:

1. Create/approve template in Templates module.
2. Update automation action to include `templateId` and param arrays.
3. Keep trigger unchanged (`order_created` / `order.created`).

## 10. Worker schema note

Current worker uses an older Prisma schema snapshot, so template/quota reads/writes in worker template action use SQL via:

- `prisma.$queryRawUnsafe`
- `prisma.$executeRawUnsafe`

This is intentional for compatibility until worker Prisma schema/client is synchronized with backend schema.

## 11. Troubleshooting checklist

If automatic template message is not sent:

1. Confirm order outbox event exists and status progresses.
2. Confirm worker is running and consuming `process-order-event` jobs.
3. Confirm automation is active and trigger matches event type.
4. Confirm action has valid `templateId`.
5. Confirm template exists, belongs to workspace, and is `APPROVED`.
6. Confirm workspace subscription is `active` or `trialing`.
7. Confirm plan/quota not exhausted.
8. Confirm WhatsApp integration is active and token valid.
9. Check worker logs for `Template blocked by plan/quota` or Meta API errors.

If a simple text still sends instead of template:

- Check action JSON still contains only `message` and no `templateId`.

## 12. Recommended default configuration for order confirmations

For production-safe order confirmation automation:

- Trigger: `order_created`
- Action type: `send_template_message`
- Action config:
	- `templateId`: approved order-confirm template
	- `bodyParams`: order variables
	- optional `headerParams`, `buttonParams`

This gives consistent behavior across 24-hour window boundaries and aligns billing with plan limits.
