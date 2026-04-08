# Founder Cost Ledger Template (Bootstrap Mode)

Last updated: 2026-04-08

## Goal
Track real monthly cost of running the product so pricing stays profitable without over-spending.

## Rules
1. Use real paid invoices only. Do not add estimated tools until you actually buy them.
2. Separate one-time setup costs from recurring monthly costs.
3. Review monthly and update pricing only when cost trend is stable for 2 cycles.

## Monthly Cost Ledger

Month: YYYY-MM

### A) Infrastructure (Recurring)
- Hosting / compute:
- Database:
- Backups:
- Object storage:
- Bandwidth / CDN:
- Domain / SSL:
- Total A:

### B) Messaging and API (Recurring)
- WhatsApp template/session messaging:
- Shopify-related API/platform costs (if any):
- Email/SMS notifications:
- Total B:

### C) Security and Compliance (Recurring)
- Key management (if paid):
- Logging/monitoring (if paid):
- Compliance/legal maintenance:
- Total C:

### D) Tools and Productivity (Recurring)
- CI/CD:
- Error tracking:
- Misc SaaS:
- Total D:

### E) One-time Costs (This Month)
- Legal review:
- Security implementation:
- Other one-time:
- Total E:

### F) Grand Totals
- Recurring monthly total = A + B + C + D
- One-time total (month) = E
- All-in month total = (A + B + C + D + E)

## Unit Economics Snapshot
- Active paying workspaces:
- Total MRR:
- ARPU (MRR / paying workspaces):
- Recurring COGS per workspace = (A + B + C + D) / paying workspaces
- Gross margin % = ((MRR - recurring COGS total) / MRR) * 100

## Pricing Decision Gate

Update pricing only if one of these is true:
1. Gross margin is below your target for 2 consecutive months.
2. A major recurring cost was added and cannot be reduced.
3. Usage profile changed (template/API volume) and existing plan limits are no longer sustainable.

## Spend Approval Note (Before any new recurring tool)
- Tool/vendor:
- Why needed for compliance or reliability:
- Free alternative considered:
- Why free option is insufficient:
- Monthly budget cap:
- Re-evaluation date:
- Decision: Approved / Rejected

## Suggested Founder Targets (Editable)
- Minimum target gross margin: 60%
- Warning threshold: 50%
- Critical threshold: 40%
