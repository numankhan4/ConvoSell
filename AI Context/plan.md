## Plan: Production-Ready MVP Architecture (WhatsApp CRM for PK Sellers)

Design an MVP that is production-safe (multi-tenant, audited, retryable, idempotent) but still simple: a modular monolith split into three deployables—Next.js web, NestJS API, and a BullMQ worker—backed by Postgres + Redis and integrated with Meta WhatsApp Cloud API + Shopify webhooks. This gets you to “works reliably for paying customers” fast, while keeping a clear path to later service separation.

**System diagram (text-based)**
1. Browser (Seller UI) → Next.js (Vercel) → NestJS API (AWS ECS/Fargate) → Postgres
2. NestJS API ↔ Redis (BullMQ queues + caching + rate-limit)
3. BullMQ Worker (AWS ECS/Fargate) → Meta WhatsApp Cloud API (send) → Customer WhatsApp
4. Meta Webhooks (messages/status) → API (public webhook) → Postgres → (optional) Realtime gateway → UI
5. Shopify Webhooks (orders/fulfillment) → API (public webhook) → Postgres → enqueue follow-up jobs
6. S3 (optional MVP) for media + exports; CloudWatch/Sentry for logs/trace/errors

**Modules breakdown (MVP scope)**
1. Platform / Tenant
   - Workspaces (tenants), membership/roles (owner/agent), feature flags, plan limits.
2. Auth
   - Email/password or magic link; later add Google.
   - Session/JWT + refresh; workspace selection.
3. WhatsApp Integration (Meta Cloud)
   - Phone number registration metadata, access tokens, webhook verification.
   - Message send adapter, template management (minimal), status callbacks.
   - Rate-limit + retry policy.
4. CRM Core
   - Contacts (customers), conversations, messages, tags/labels.
   - Inbox view needs efficient querying + pagination.
5. Orders
   - Store connections (Shopify), orders import, order status (pending-confirmation/confirmed/cancelled).
   - Link orders ↔ contact.
6. Automations (simple rules MVP)
   - “On new COD order → send confirm message”
   - “If no reply in X hours → reminder”
   - “If customer replies YES/NO → update order + tag”
7. Webhooks / Ingress
   - Shopify webhook handler + signature verify + idempotency.
   - WhatsApp webhook handler + verify token + signature + idempotency.
8. Jobs / Outbox
   - Persistent outbox table (recommended) + BullMQ queue.
   - Workers for send message, retries, follow-ups.
9. Observability
   - Structured logs with correlation IDs; audit log for user actions.

**Data flow (end-to-end)**
1. Onboarding
   - Seller signs up → create workspace → add team members → connect WhatsApp business phone (Cloud API) + connect Shopify.
2. Order ingestion (Shopify → platform)
   - Shopify sends ORDER_CREATE webhook → API verifies HMAC → upserts customer/contact + order.
   - API writes an Outbox event “ORDER_CREATED” in Postgres (same transaction) → enqueues BullMQ job.
3. Confirmation automation (platform → WhatsApp)
   - Worker consumes job → builds message (template or freeform) → calls Meta send API.
   - Worker stores message record with provider_message_id and status “sent/queued”.
4. Message status + replies (WhatsApp → platform)
   - Meta posts webhook events (delivered/read/failed + inbound messages).
   - API verifies signature, idempotency key, stores inbound message, updates conversation.
   - If inbound matches confirmation intent (YES/NO or buttons) → update order status + tag contact; enqueue any follow-up (e.g., confirmed notification).
5. Seller UI updates
   - UI polls or subscribes (SSE/WebSocket optional) to conversation/order changes.
   - Agents see inbox with conversation + linked order; can manually override and send messages.

**Key design decisions & tradeoffs**
1. Modular monolith now vs microservices later
   - Recommend modular monolith (NestJS modules) + separate worker process. Split later by moving “Integrations/Jobs” into their own service once throughput demands it.
2. REST vs GraphQL
   - Recommend REST for MVP: easier webhooks, simpler caching, predictable permissions. Consider GraphQL later for complex dashboard aggregation.
3. Multi-tenancy model
   - Recommend shared DB with strict tenant_id on every row + RLS (Postgres) if team is comfortable; otherwise enforce in app layer consistently.
4. Messaging reliability
   - Must use idempotency + outbox pattern; BullMQ alone is not sufficient to guarantee “exactly once” effects.
5. Realtime updates
   - Start with short polling; add SSE/WebSockets only if inbox feels laggy or agents need sub-second updates.
6. Meta WhatsApp constraints
   - Template approvals + 24-hour customer care window constrain automation; plan UX around template use for outbound after 24h.

**Implementation sequencing (high-level)**
1. Foundation
   - Choose NestJS + Prisma/Drizzle; set up tenant auth, Postgres schema, Redis/BullMQ.
2. WhatsApp webhooks + send adapter
   - Verify webhook + store inbound/outbound + status updates.
3. Shopify integration
   - OAuth app + webhook ingestion + order mapping.
4. Automations MVP
   - Rule: new COD order → confirm; follow-up reminder.
5. Inbox UI + order view
   - Conversations list, message thread, order sidebar, tags.
6. Hardening
   - Rate limits, retries, dead-letter handling, audit logs, alerts.

**Relevant artifacts in your workspace**
- (PDFs) You already have product specs: MVP feature list, UI/API structure, and DB schema drafts; we can align this architecture to those documents once you share their key requirements or export them to text.

**Verification (what “production-ready MVP” means)**
1. Load/throughput checks: simulate webhook bursts + message sends; verify worker concurrency + rate-limits.
2. Reliability checks: repeated webhook deliveries should not duplicate orders/messages.
3. Security checks: signature verification for Shopify/Meta, tenant isolation tests, least-privilege tokens.
4. Operational checks: dashboards/alerts for queue depth, failure rates, webhook error spikes.

**Scope boundaries**
- Included: WhatsApp order confirmation, basic CRM (contacts/conversations/tags), Shopify order ingestion, minimal automations, queues, audit/logging.
- Excluded for MVP: courier integrations, advanced analytics/profit tracking, fraud scoring model (Phase 2).

**Further considerations (quick questions to resolve next)**
1. WhatsApp onboarding approach: Do you intend to require sellers to bring their own Meta Business + WABA, or will you resell/host WABA setup? This impacts onboarding UX and support overhead.
2. Shopify integration mode: Private app per store vs public Shopify app (recommended) with OAuth. Public app is more work but scales.
