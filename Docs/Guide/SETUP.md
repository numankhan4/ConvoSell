## 🚀 WhatsApp CRM - Setup Guide

### Prerequisites

1. **Node.js 20+** installed
2. **Docker & Docker Compose** installed
3. **PostgreSQL 15+** (or use Docker)
4. **Redis 7+** (or use Docker)

### Quick Start (Development)

#### 1. Clone and Install Dependencies

```bash
# Navigate to project
cd "WhatsApp CRM POC"

# Install backend dependencies
cd backend
npm install
cd ..

# Install worker dependencies
cd worker
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### 2. Start Infrastructure

```bash
# Start PostgreSQL + Redis with Docker
docker-compose up -d
```

#### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

**Worker** (`worker/.env`):
```bash
cp worker/.env.example worker/.env
# Edit worker/.env
```

**Frontend** (`frontend/.env.local`):
```bash
cp frontend/.env.local.example frontend/.env.local
# Usually default values work for local development
```

#### 4. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

#### 5. Start Services

Open 3 separate terminals:

**Terminal 1 - Backend API:**
```bash
cd backend
npm run start:dev
# Runs on http://localhost:3000
```

**Terminal 2 - Worker:**
```bash
cd worker
npm run start:dev
# Processes background jobs
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3001
```

#### 6. Access the Application

Open your browser:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api

### 🔧 Configuration

#### WhatsApp Integration (Meta Cloud API)

1. Create a Meta Business Account
2. Create a WhatsApp Business App
3. Get your:
   - `WHATSAPP_API_TOKEN` (access token)
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (create your own secret)

4. Configure webhooks:
   - URL: `https://your-domain.com/api/whatsapp/webhook`
   - Verify token: (your WHATSAPP_WEBHOOK_VERIFY_TOKEN)
   - Subscribe to: `messages`, `message_status`

#### Shopify Integration

1. Create a Shopify Partner account
2. Create a custom app or public app
3. Get your:
   - `SHOPIFY_CLIENT_ID`
   - `SHOPIFY_CLIENT_SECRET`
   - `SHOPIFY_WEBHOOK_SECRET`

4. Configure webhooks:
   - URL: `https://your-domain.com/api/shopify/webhook`
   - Events: `orders/create`, `orders/fulfilled`

### 📦 Production Deployment

#### Option 1: Docker (Recommended)

```bash
# Build images
docker build -t whatsapp-crm-backend ./backend
docker build -t whatsapp-crm-worker ./worker
docker build -t whatsapp-crm-frontend ./frontend

# Run with docker-compose (production)
docker-compose -f docker-compose.prod.yml up -d
```

#### Option 2: AWS Deployment

**Backend & Worker (ECS Fargate):**
1. Push Docker images to ECR
2. Create ECS task definitions
3. Create ECS services with auto-scaling
4. Configure Application Load Balancer

**Frontend (Vercel):**
```bash
cd frontend
npx vercel --prod
```

**Database (RDS PostgreSQL):**
1. Create RDS PostgreSQL instance
2. Run migrations: `npx prisma migrate deploy`

**Cache/Queue (ElastiCache Redis):**
1. Create ElastiCache Redis cluster
2. Update connection strings in environment variables

### 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Run specific test
npm test -- auth.service.spec.ts
```

### 📊 Database Management

```bash
# View data with Prisma Studio
cd backend
npx prisma studio

# Create new migration
npx prisma migrate dev --name add_new_feature

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### 🔍 Monitoring & Debugging

**View logs:**
```bash
# Backend
cd backend
npm run start:dev

# Worker
cd worker
npm run start:dev
```

**Check queue status:**
- Install BullMQ Board (optional): https://github.com/felixmosh/bull-monitor

**Database queries:**
```bash
cd backend
npx prisma studio
```

### 🐛 Common Issues

**Issue: Database connection failed**
- Ensure PostgreSQL is running: `docker ps`
- Check DATABASE_URL in `.env`
- Run: `docker-compose up -d postgres`

**Issue: Redis connection failed**
- Ensure Redis is running: `docker ps`
- Check REDIS_URL in `.env`
- Run: `docker-compose up -d redis`

**Issue: WhatsApp messages not sending**
- Verify WHATSAPP_API_TOKEN is valid
- Check Meta Business account status
- Review worker logs for errors

**Issue: Shopify webhooks not received**
- Ensure webhook URL is publicly accessible (use ngrok for local testing)
- Verify SHOPIFY_WEBHOOK_SECRET matches
- Check webhook signature verification

### 🔐 Security Checklist

- [ ] Change all default secrets in production
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database encryption at rest
- [ ] Use environment-specific secrets (staging vs production)
- [ ] Implement proper error handling (don't expose internal errors)

### 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Shopify API Documentation](https://shopify.dev/docs/api)

### 🆘 Support

For issues and questions:
1. Check existing documentation
2. Review error logs
3. Search GitHub issues
4. Contact support team

---

**Happy Building! 🚀**
