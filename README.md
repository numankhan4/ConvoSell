# ConvoSell - Convert Conversations into Sales

An open-source framework for WhatsApp commerce automation, CRM workflows, and Shopify order operations. It is designed as a modular monolith that teams can run locally, extend, and adapt for their own ecommerce support and order-confirmation flows.

## 🏗️ Architecture

**Modular Monolith** split into 3 deployables:
- **Frontend**: Next.js 14 (App Router) + Tailwind - Vercel
- **Backend API**: NestJS + Prisma + PostgreSQL - AWS ECS/Fargate
- **Worker**: BullMQ worker process - AWS ECS/Fargate

**Key Integrations**:
- Meta WhatsApp Cloud API (send/receive messages)
- Shopify (order webhooks, OAuth)

## 📁 Project Structure

```
.
├── backend/              # NestJS API server
│   ├── src/
│   │   ├── auth/        # Authentication & JWT
│   │   ├── tenant/      # Multi-tenancy & workspaces
│   │   ├── whatsapp/    # WhatsApp integration (Meta Cloud API)
│   │   ├── shopify/     # Shopify integration
│   │   ├── crm/         # Contacts, conversations, messages
│   │   ├── orders/      # Order management
│   │   ├── automations/ # Rule engine
│   │   ├── webhooks/    # Webhook ingress handlers
│   │   ├── jobs/        # Job definitions & outbox
│   │   └── common/      # Shared utilities, guards, decorators
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── worker/              # BullMQ worker (message sending, retries)
│   ├── src/
│   │   ├── processors/  # Job processors
│   │   └── main.ts
│   └── package.json
│
├── frontend/            # Next.js dashboard
│   ├── app/            # App router pages
│   ├── components/     # React components
│   ├── lib/            # API client, utilities
│   └── package.json
│
├── docker-compose.yml  # Local dev (Postgres, Redis)
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop (running)
- Git

### One-Command Startup

**Windows (PowerShell - Recommended):**
```powershell
./start-dev.ps1
```

**Windows (Batch):**
```cmd
start-dev.bat
```

**Cross-Platform:**
```bash
npm start
```

This will:
1. ✅ Check prerequisites (Node.js, npm, Docker)
2. ✅ Start Docker containers (PostgreSQL + Redis)
3. ✅ Start Backend API on http://localhost:3000
4. ✅ Start Worker service
5. ✅ Start Frontend on http://localhost:3004

### First Time Setup

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd "WhatsApp CRM POC"
   npm run install:all
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env` in `backend/`, `worker/`, and `frontend/`
   - Update with your credentials (see `CONFIGURATION.md`)
   - Never commit `.env` files, access tokens, API secrets, or real customer data

3. **Initialize database:**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. **Start everything:**
   ```powershell
   ./start-dev.ps1
   ```

5. **Access the app:**
   - Frontend: http://localhost:3004
   - Backend API: http://localhost:3000/api

### Stop Services

```powershell
./stop-dev.ps1
```

For detailed startup options and troubleshooting, see [START.md](START.md)

## 🔧 Configuration

Copy `.env.example` to `.env` in each service folder and configure:

**Backend & Worker**:
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `JWT_SECRET`: Auth secret
- `WHATSAPP_API_TOKEN`: Meta Cloud API token
- `WHATSAPP_PHONE_NUMBER_ID`: Your WhatsApp Business phone
- `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`: Shopify app credentials

**Frontend**:
- `NEXT_PUBLIC_API_URL`: Backend API URL

## 📊 Database

Multi-tenant PostgreSQL schema with:
- Workspace/tenant isolation (`tenant_id` on all tables)
- Outbox pattern for reliable message delivery
- Audit logs for compliance

## 🔐 Security

- HMAC signature verification (Shopify webhooks)
- Meta webhook signature verification
- Tenant isolation in queries (guard-level enforcement)
- Rate limiting (Redis-backed)
- Idempotency keys for webhooks

## 📦 Deployment

- **Frontend**: Vercel (zero-config)
- **Backend + Worker**: AWS ECS Fargate (Dockerfile provided)
- **Database**: AWS RDS PostgreSQL
- **Cache/Queue**: AWS ElastiCache Redis

## 📝 Development Workflow

1. Create feature branch
2. Implement with tests
3. Run `npm test` and `npm run lint`
4. Create PR
5. Deploy to staging → production

## 🤝 Open Source

- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Funding links: [.github/FUNDING.yml](.github/FUNDING.yml)

## 🎯 MVP Scope (Phase 1)

✅ WhatsApp order confirmation automation
✅ Basic CRM (contacts, conversations, tags)
✅ Shopify order ingestion
✅ Manual message sending from inbox
✅ Simple rule-based automations
✅ Multi-tenant workspaces

## 🔮 Roadmap

**Phase 2**: Fraud detection, customer scoring, campaigns
**Phase 3**: Courier integration, profit analytics

## 📄 License

MIT - see [LICENSE](LICENSE)
