# 🏗️ SYSTEM ARCHITECTURE

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                             │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                       │
           │                                       │
    ┌──────▼─────────┐                     ┌─────▼────────┐
    │   Meta Cloud   │                     │   Shopify    │
    │   WhatsApp API │                     │   Platform   │
    └──────┬─────────┘                     └─────┬────────┘
           │                                      │
           │ Webhooks                    Webhooks │
           │ (messages)                  (orders) │
           │                                      │
    ┌──────▼──────────────────────────────────────▼────────┐
    │                 NestJS Backend API                    │
    │  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌─────────┐│
    │  │   Auth   │  │WhatsApp │  │Shopify │  │   CRM   ││
    │  │  Module  │  │ Module  │  │ Module │  │ Module  ││
    │  └──────────┘  └─────────┘  └────────┘  └─────────┘│
    │  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌─────────┐│
    │  │  Orders  │  │Automate │  │ Jobs   │  │ Tenant  ││
    │  │  Module  │  │ Module  │  │ Module │  │ Module  ││
    │  └──────────┘  └─────────┘  └────────┘  └─────────┘│
    └───────────┬──────────────────────────────────────────┘
                │
                │ HTTP + WebSocket
                │
    ┌───────────▼─────────────────┐
    │      Next.js Frontend       │
    │  ┌─────────┐  ┌──────────┐ │
    │  │Dashboard│  │  Inbox   │ │
    │  └─────────┘  └──────────┘ │
    │  ┌─────────┐  ┌──────────┐ │
    │  │ Orders  │  │ Settings │ │
    │  └─────────┘  └──────────┘ │
    └─────────────────────────────┘
                │
                │ Browser
                │
        ┌───────▼────────┐
        │   End Users    │
        │   (Sellers)    │
        └────────────────┘

    ┌──────────────────────────────────┐
    │     BullMQ Worker Service        │
    │  ┌───────────────────────────┐  │
    │  │  Order Event Processor     │  │
    │  │  Message Send Processor    │  │
    │  │  Automation Executor       │  │
    │  └───────────────────────────┘  │
    └────────┬─────────────────────────┘
             │
             │ Job Queue
             │
    ┌────────▼─────────────────────────┐
    │           Redis                  │
    │  ┌──────────┐   ┌────────────┐  │
    │  │  Queues  │   │   Cache    │  │
    │  └──────────┘   └────────────┘  │
    └──────────────────────────────────┘

    ┌──────────────────────────────────┐
    │        PostgreSQL                │
    │  ┌──────────────────────────┐   │
    │  │  Multi-tenant Database   │   │
    │  │  - Users                 │   │
    │  │  - Workspaces            │   │
    │  │  - Contacts              │   │
    │  │  - Messages              │   │
    │  │  - Orders                │   │
    │  │  - OutboxEvents          │   │
    │  └──────────────────────────┘   │
    └──────────────────────────────────┘
```

---

## Module Breakdown

### **Backend API (NestJS)**

```
backend/src/
├── auth/                 # JWT authentication, registration, login
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/       # passport-jwt, passport-local
│   └── guards/           # JWT guard, local guard
│
├── tenant/               # Workspace management
│   ├── tenant.controller.ts
│   ├── tenant.service.ts
│   └── dto/
│
├── whatsapp/             # Meta WhatsApp Cloud API integration
│   ├── whatsapp.controller.ts
│   ├── whatsapp.service.ts  # Send messages, handle webhooks
│   └── dto/
│
├── shopify/              # Shopify webhooks & OAuth
│   ├── shopify.controller.ts
│   ├── shopify.service.ts   # Order ingestion, HMAC verification
│   └── dto/
│
├── crm/                  # Contacts, Conversations, Messages
│   ├── crm.controller.ts
│   ├── crm.service.ts       # Inbox, contact management, tags
│   └── dto/
│
├── orders/               # Order management
│   ├── orders.controller.ts
│   ├── orders.service.ts    # Status updates, statistics
│   └── dto/
│
├── automations/          # Rule-based automation engine
│   ├── automations.controller.ts
│   ├── automations.service.ts  # Trigger matching, action execution
│   └── dto/
│
├── webhooks/             # Webhook ingress & idempotency
│   └── webhooks.service.ts
│
├── jobs/                 # Job queue management
│   └── jobs.service.ts      # Outbox processor, enqueue logic
│
└── common/               # Shared utilities
    ├── prisma/           # Database service
    ├── guards/           # Tenant guard, roles guard
    └── decorators/       # @CurrentUser, @WorkspaceId
```

---

## Data Flow Diagrams

### **1. Order Confirmation Flow**

```
Shopify          Backend API         Database       Outbox Worker       BullMQ          WhatsApp API
   │                  │                  │                │                │                │
   │─Order Created───>│                  │                │                │                │
   │                  │──Verify HMAC────>│                │                │                │
   │                  │                  │                │                │                │
   │                  │──Create Contact─>│                │                │                │
   │                  │──Create Order───>│                │                │                │
   │                  │──Write Outbox───>│                │                │                │
   │<───200 OK────────│                  │                │                │                │
   │                  │                  │                │                │                │
   │                  │                  │<───Poll────────│                │                │
   │                  │                  │──Events───────>│                │                │
   │                  │                  │                │───Enqueue─────>│                │
   │                  │                  │                │                │                │
   │                  │                  │                │<──Process Job──│                │
   │                  │                  │                │                │                │
   │                  │                  │                │───Execute──────│                │
   │                  │                  │                │  Automation    │                │
   │                  │                  │                │                │                │
   │                  │                  │                │────────────────Send Message────>│
   │                  │                  │<──Store Msg────│                │                │
   │                  │                  │<──Update Order─│                │                │
   │                  │                  │<──Mark Done────│                │                │
   │                  │                  │                │                │<──200 OK───────│
```

### **2. Customer Reply Flow**

```
WhatsApp API     Backend API        Database        Frontend (Agent)
      │                │                │                    │
      │──Message────-->│                │                    │
      │  Webhook       │──Verify────────│                    │
      │                │  Signature     │                    │
      │                │                │                    │
      │                │──Create/Get────│                    │
      │                │  Contact       │                    │
      │                │                │                    │
      │                │──Create/Get────│                    │
      │                │  Conversation  │                    │
      │                │                │                    │
      │                │──Store─────────│                    │
      │                │  Message       │                    │
      │                │                │                    │
      │<───200 OK──────│                │                    │
      │                │                │                    │
      │                │                │<──Poll Inbox───────│
      │                │                │──Conversations─────>│
      │                │                │                    │
      │                │                │<──Get Messages─────│
      │                │                │──Messages──────────>│
      │                │                │                    │
      │                │                │<──Send Reply───────│
      │                │──Outbox────────│                    │
      │                │  Event         │                    │
      │<──────────────Send via Worker via BullMQ──────────────│
```

---

## Technology Stack

### **Backend**
- **Framework:** NestJS 10
- **Runtime:** Node.js 20
- **Language:** TypeScript 5
- **ORM:** Prisma 5
- **Auth:** JWT, Passport.js
- **Validation:** class-validator, class-transformer
- **Queue:** BullMQ 5

### **Worker**
- **Queue:** BullMQ 5
- **Runtime:** Node.js 20
- **Language:** TypeScript 5
- **ORM:** Prisma 5 (shared schema)

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Styling:** Tailwind CSS 3
- **State:** Zustand 4
- **HTTP Client:** Axios

### **Database & Cache**
- **Database:** PostgreSQL 15
- **Schema:** Prisma migrations
- **Cache/Queue:** Redis 7

### **Infrastructure**
- **Containerization:** Docker, Docker Compose
- **Process Manager:** PM2
- **Cloud:** AWS (ECS Fargate), Vercel

---

## Security Architecture

### **Authentication Flow**

```
User Browser          Frontend           Backend API         Database
     │                    │                    │                 │
     │──Login Form───────>│                    │                 │
     │                    │─POST /auth/login──>│                 │
     │                    │                    │──Query User────>│
     │                    │                    │<──User Data─────│
     │                    │                    │                 │
     │                    │                    │──bcrypt.compare─>│
     │                    │                    │                 │
     │                    │                    │──Generate JWT───│
     │                    │<──JWT + User───────│                 │
     │<──Store Token──────│                    │                 │
     │                    │                    │                 │
     │──API Request───────│──Headers:──────────│                 │
     │  (Protected)       │  Authorization:    │                 │
     │                    │  Bearer <token>    │                 │
     │                    │  X-Workspace-ID    │                 │
     │                    │                    │──Verify JWT─────│
     │                    │                    │──Check Tenant───│
     │                    │                    │──Query Data────>│
     │                    │<──Response─────────│                 │
     │<──Data─────────────│                    │                 │
```

### **Webhook Security**

**Shopify:**
- HMAC-SHA256 signature verification
- Header: `X-Shopify-Hmac-Sha256`
- Secret: `SHOPIFY_WEBHOOK_SECRET`

**Meta WhatsApp:**
- SHA256 signature verification
- Header: `X-Hub-Signature-256`
- Secret: `WHATSAPP_WEBHOOK_SECRET`

**Idempotency:**
- All webhooks recorded in `webhook_events` table
- Duplicate external IDs ignored

---

## Scalability & Performance

### **Current Capacity (MVP)**
- **Backend:** 2 instances (ECS tasks)
- **Worker:** 1-3 instances (auto-scaling)
- **Database:** Single RDS instance (vertical scaling)
- **Redis:** Single ElastiCache node

### **Scale Path**

**Phase 1 (0-1K users):**
- Current architecture ✅

**Phase 2 (1K-10K users):**
- Add read replicas for Postgres
- Increase worker instances (5-10)
- Add Redis cluster (high availability)
- CDN for static assets

**Phase 3 (10K-100K users):**
- Split integrations into separate services
- Event-driven architecture (EventBridge/SNS)
- Database sharding by workspace
- Implement caching layer (Redis + CloudFront)

**Phase 4 (100K+ users):**
- Full microservices
- Kubernetes orchestration
- Multi-region deployment
- Real-time infrastructure (WebSockets)

---

## Reliability Patterns

### **1. Outbox Pattern**
```
┌────────────────────┐
│  API Transaction   │
│  ┌──────────────┐  │
│  │ Create Order │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │Write Outbox  │  │
│  │    Event     │  │
│  └──────────────┘  │
│  (COMMIT)          │
└────────────────────┘
         │
         │ Async
         ▼
┌────────────────────┐
│  Worker Processor  │
│  ┌──────────────┐  │
│  │ Poll Events  │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │Process Event │  │
│  └──────────────┘  │
│  ┌──────────────┐  │
│  │Mark Complete │  │
│  └──────────────┘  │
└────────────────────┘
```

### **2. Idempotency**
- Webhooks deduplicated by external ID
- Outbox events processed at-most-once
- Messages tracked by provider message ID

### **3. Retry Logic**
- Outbox events: max 3 attempts
- BullMQ: exponential backoff
- Dead-letter queue for manual review

---

## Monitoring & Observability

### **Recommended Tooling**

**Logs:**
- Structured JSON logs (Winston/Pino)
- Centralized: CloudWatch Logs or Datadog

**Metrics:**
- Queue depth (BullMQ)
- Webhook processing time
- API response times
- Error rates

**Tracing:**
- Correlation IDs on all logs
- Request tracking (OpenTelemetry)

**Alerts:**
- High queue depth (> 1000)
- Failed webhook deliveries
- High error rate (> 5%)
- Database connection failures

---

## Cost Estimation (MVP)

**AWS (Monthly):**
- ECS Fargate (Backend): $50-100
- ECS Fargate (Worker): $25-50
- RDS PostgreSQL (db.t4g.micro): $25
- ElastiCache Redis (cache.t4g.micro): $20
- ALB: $20
- S3 + CloudWatch: $10
- **Total:** ~$150-225/month

**Vercel (Frontend):**
- Free tier or Pro ($20/month)

**Third-Party:**
- Meta WhatsApp (usage-based)
- Shopify (app hosting: free)

**Total MVP:** ~$170-250/month

---

## Deployment Architecture

```
       ┌──────────────────────────┐
       │      Cloudflare/DNS      │
       └──────────┬───────────────┘
                  │
       ┌──────────▼───────────────┐
       │   Application Load       │
       │       Balancer           │
       └──────────┬───────────────┘
                  │
       ┌──────────▼───────────────┐
       │     ECS Cluster          │
       │  ┌────────────────────┐  │
       │  │  Backend Service   │  │
       │  │  (2 tasks)         │  │
       │  └────────────────────┘  │
       │  ┌────────────────────┐  │
       │  │  Worker Service    │  │
       │  │  (1-3 tasks)       │  │
       │  └────────────────────┘  │
       └──────────────────────────┘
                  │
       ┌──────────▼───────────────┐
       │      VPC Private         │
       │       Subnets            │
       │  ┌─────────────────────┐ │
       │  │  RDS PostgreSQL     │ │
       │  └─────────────────────┘ │
       │  ┌─────────────────────┐ │
       │  │ ElastiCache Redis   │ │
       │  └─────────────────────┘ │
       └──────────────────────────┘

       ┌──────────────────────────┐
       │      Vercel CDN          │
       │  (Next.js Frontend)      │
       └──────────────────────────┘
```

---

**This architecture is designed for:**
✅ Production reliability
✅ Easy scaling
✅ Cost-effective MVP
✅ Clear upgrade path

**Ready to deploy! 🚀**
