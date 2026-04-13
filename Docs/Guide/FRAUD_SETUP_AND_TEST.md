# Fraud Detection Setup and Smoke Test

This guide configures and verifies the fraud module implemented in backend and worker.

## 1) Required Environment Variables

### Backend (.env)
Add these values in backend/.env:

- INTERNAL_WORKER_KEY="<same-secret-used-by-worker>"
- GEO_API_BASE_URL="https://ipapi.co"
- GEO_API_KEY="" (optional; only needed for paid geo providers)

### Worker (.env)
Add these values in worker/.env:

- BACKEND_INTERNAL_URL="http://localhost:3000"
- INTERNAL_WORKER_KEY="<same-secret-used-by-backend>"

Important:
- INTERNAL_WORKER_KEY must be exactly the same in backend and worker.

## 2) Database Migration

From backend folder:

```powershell
npm run prisma:migrate
npm run prisma:generate
```

Expected result:
- Migration applied successfully
- Prisma client generated

## 3) Start Services

Start backend:

```powershell
cd backend
npm run start:dev
```

Start worker in a separate terminal:

```powershell
cd worker
npm run start:dev
```

## 4) Smoke Test A: Direct Fraud Check API

Use internal endpoint (no JWT required, worker key required):

```powershell
$headers = @{ 'x-internal-worker-key' = '<your-internal-worker-key>' }
$body = @{
  orderId = '<existing-order-id>'
  forceRecompute = $true
  includeGeo = $false
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/fraud/internal/check' -Headers $headers -Body $body -ContentType 'application/json' | ConvertTo-Json -Depth 10
```

Expected result:
- JSON includes final_fraud_score, fraud_decision, explanation, detector_breakdown, latency_ms.

## 5) Smoke Test B: Queue/Worker Path

Create an outbox event and let existing jobs + worker process it.

```powershell
cd backend
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); (async()=>{const e=await p.outboxEvent.create({data:{workspaceId:'<workspace-id>',eventType:'order.fraud_check',aggregateId:'<order-id>',payload:{workspaceId:'<workspace-id>',orderId:'<order-id>'}}}); console.log(e.id); await p.$disconnect();})().catch(async e=>{console.error(e); await p.$disconnect(); process.exit(1);});"
```

Check worker logs should show:
- Processing order event: order.fraud_check
- Fraud assessment completed for order: <order-id>

Verify outbox status:

```powershell
cd backend
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); (async()=>{const e=await p.outboxEvent.findFirst({where:{eventType:'order.fraud_check'},orderBy:{createdAt:'desc'}}); console.log(JSON.stringify({id:e?.id,status:e?.status,processedAt:e?.processedAt,lastError:e?.lastError},null,2)); await p.$disconnect();})().catch(async e=>{console.error(e); await p.$disconnect(); process.exit(1);});"
```

Expected result:
- status = "completed"
- processedAt is not null

## 6) Optional: Verify Persisted Assessment

```powershell
cd backend
node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); (async()=>{const a=await p.fraudAssessment.findFirst({where:{orderId:'<order-id>'},orderBy:{checkedAt:'desc'},include:{signals:true}}); console.log(JSON.stringify({found:!!a,score:a?.finalFraudScore,decision:a?.fraudDecision,signals:a?.signals?.length||0,checkedAt:a?.checkedAt||null},null,2)); await p.$disconnect();})().catch(async e=>{console.error(e); await p.$disconnect(); process.exit(1);});"
```

Expected result:
- found = true
- score and decision populated
- signals count >= 0

## 7) Troubleshooting

- 403 Invalid internal worker key:
  - Backend and worker keys do not match, or backend was not restarted after env change.
- Unable to connect to localhost:3000:
  - Backend is not fully started yet or port is occupied by another process.
- Outbox event stays pending:
  - Jobs loop or worker is not running, or Redis is not available.

## 8) Frontend Fraud Workflow

Fraud UI is integrated in the Orders dashboard.

Where to use:
- Dashboard -> Orders

Available actions per order:
- Check Fraud: runs POST /api/fraud/check for the selected order.
- View Fraud Report: opens latest score, decision, reasons, and signals.

List-level features:
- Fraud badges auto-load for visible orders.
- Fraud filter chips: All, Approve, Verify, Block, Unchecked.

Supporting API endpoint used by UI:
- GET /api/fraud/summaries?orderIds=<comma-separated-order-ids>
- POST /api/fraud/check-batch

Expected behavior:
- Checking fraud updates badge and score immediately.
- Report modal shows explanation and detector signals.
- Batch action "Check Visible Unchecked" runs fraud checks for currently visible unchecked rows.

Batch endpoint payload example:

```json
{
  "orderIds": ["order_id_1", "order_id_2"],
  "forceRecompute": true,
  "includeGeo": false
}
```
