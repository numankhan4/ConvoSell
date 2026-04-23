# Public Launch + Free Deploy Guide

Use this guide when you want to make the repository public and deploy with free tiers.

## 1) Final Pre-Public Security Checklist

Complete these before changing repository visibility:

1. Rotate Meta/WhatsApp secrets:
   - Access token(s)
   - Webhook verify token(s)
2. Rotate Shopify secrets:
   - Client secret
   - Any active access tokens
3. Revoke old tokens in provider dashboards.
4. In GitHub repo settings, enable:
   - Secret scanning
   - Push protection

## 2) Make Repository Public

GitHub UI path:
1. Open repository on GitHub.
2. Go to Settings -> General -> Danger Zone.
3. Click Change repository visibility.
4. Select Public and confirm.

## 3) Deployment Reality Check

- GitHub Pages is static hosting only.
- This app includes backend API + worker + PostgreSQL + Redis, so GitHub Pages alone cannot run the full system.
- Best low-cost/free path is:
  - Frontend: Vercel
  - Backend API: Render web service (or Railway/Fly)
  - Worker: Render worker service (or Railway/Fly)
  - PostgreSQL: Neon
  - Redis: Upstash

## 4) Fastest Working Architecture (Recommended)

- App URL: `https://app.yourdomain.com` -> Vercel frontend
- API URL: `https://api.yourdomain.com` -> backend service
- Worker: background service (no public URL)

## 5) Deploy Frontend on Vercel (Free)

1. Login to Vercel and import your GitHub repository.
2. Set Root Directory to `frontend`.
3. Framework preset: Next.js (auto-detected).
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
5. Deploy.

## 6) Deploy Backend + Worker

Use your preferred provider. For Render-like setup:

### One-click baseline with Render Blueprint

This repository now includes `render.yaml` at root.

Steps:
1. Push latest `main` to GitHub.
2. In Render dashboard, click **New +** -> **Blueprint**.
3. Select this GitHub repo.
4. Render detects `render.yaml` and creates:
   - `convosell-backend` (web service)
   - `convosell-worker` (worker service)
5. Fill secret env vars when prompted (see section below).
6. Deploy both services.

After backend deploy, Render gives you a URL like:
- `https://convosell-backend.onrender.com`

Your API base is:
- `https://convosell-backend.onrender.com/api`

After custom domain setup, this becomes:
- `https://api.yourdomain.com/api`

### Backend service
- Root: `backend`
- Build: `npm install && npm run build`
- Start: `npm run start:prod`
- Add env vars:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `JWT_SECRET`
  - `WHATSAPP_CRM_ENCRYPTION_KEY`
  - `INTERNAL_WORKER_KEY`
  - `FRONTEND_URL=https://app.yourdomain.com`
  - WhatsApp/Shopify provider vars as needed

Minimum required to boot reliably:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `WHATSAPP_CRM_ENCRYPTION_KEY`
- `INTERNAL_WORKER_KEY`
- `FRONTEND_URL`

### Worker service
- Root: `worker`
- Build: `npm install && npm run build`
- Start: `npm run start`
- Add env vars:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `BACKEND_INTERNAL_URL=https://api.yourdomain.com`
  - `INTERNAL_WORKER_KEY` (must match backend)

## 7) Configure Domain

At your DNS provider:

1. `app.yourdomain.com` -> connect to Vercel project domain.
2. `api.yourdomain.com` -> CNAME/A record to backend host.
3. Keep root/apex (`yourdomain.com`) either:
   - Redirect to `app.yourdomain.com`, or
   - Also attach to Vercel.

Then update provider callbacks/webhooks:

- Meta webhook callback URL -> `https://api.yourdomain.com/api/whatsapp/webhook/...`
- Shopify webhook URL -> `https://api.yourdomain.com/api/shopify/webhook`
- Shopify/Meta OAuth redirect URLs -> use `app.yourdomain.com` as configured by your app flow

## 8) Post-Deploy Smoke Test

1. Open `https://app.yourdomain.com` and login.
2. Hit backend health endpoint:
   - `https://api.yourdomain.com/api/health` (or your configured health route)
3. Confirm DB migrations are applied.
4. Send one WhatsApp test message and verify webhook ingestion.
5. Confirm worker consumes jobs (order/message processing).

## 9) Cost Expectations (Typical)

- Vercel hobby: free for starter usage.
- Neon free tier: suitable for MVP/dev traffic.
- Upstash free tier: suitable for MVP queue/cache.
- Backend/worker compute: usually free-trial or low-cost tiers depending on provider.

### Practical free stack recommendation

- Backend + Worker: Render free instances
- PostgreSQL: Neon free database
- Redis: Upstash free Redis

Copy these URLs into Render env vars:
- `DATABASE_URL` from Neon
- `REDIS_URL` from Upstash

## 10) If You Want Only a Public Demo Today

If you want immediate public visibility with minimal ops:

1. Deploy only frontend to Vercel.
2. Keep backend local/private for now.
3. Clearly mark demo limitations in README.

This gives a public URL quickly while you finish backend hosting setup.
