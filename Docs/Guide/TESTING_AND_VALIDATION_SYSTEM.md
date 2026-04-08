# Testing and Validation System (Flexible)

Last updated: 2026-04-08
Owner: Founder / Engineering

## Goal
Provide a practical testing mechanism that supports both:
1. Automated checks for fast feedback.
2. Manual validation with documented evidence for compliance and operations.

## Operating Modes

Mode A: Fast local checks (daily)
- Use when coding features or bug fixes.
- Focus: breakage detection with minimal effort.

Mode B: Pre-release checks (before deploy)
- Use before any production release.
- Focus: quality gate and regression safety.

Mode C: Compliance evidence checks (weekly/monthly)
- Use for Shopify/protected-data readiness.
- Focus: documentation, drills, and auditable artifacts.

## Automated Checks

### Backend
- Command: npm run security:check (in backend)
- Purpose: validate password and encryption compatibility rules.

### Root shortcuts
- Command: npm run verify:auto
- Command: npm run verify:pre-release

### Recommended cadence
1. Daily: verify:auto
2. Before release: verify:pre-release

## Manual Checks (Documented)

Use these documents:
1. Test run log: Docs/Guide/MANUAL_TEST_RUN_LOG_TEMPLATE.md
2. Backup restore drill: Docs/Compliance/BACKUP_RESTORE_DRILL_TEMPLATE.md
3. Cost tracking: Docs/Guide/FOUNDER_COST_LEDGER_TEMPLATE.md
4. Current scheduled drill report: Docs/Compliance/Backup-Drills/2026-04-Q2-DRILL-01.md

## Control-to-Test Mapping (Current Session Scope)

1. Password policy hardening
- Automated: security:check
- Manual: register with weak/strong password and capture API result

2. Secret encryption at rest (Shopify + WhatsApp)
- Automated: security:check
- Manual: verify encrypted prefix in DB sample rows after write operations

3. Personal-data access auditing
- Automated: compile/type checks + endpoint smoke calls
- Manual: execute list/detail/export actions and verify audit log records

4. Export endpoints and permissions
- Automated: endpoint smoke tests (scripted curl/postman collection optional)
- Manual: verify export denied/allowed by role and audit action is stored

5. Backup and recovery readiness
- Automated: none required
- Manual: quarterly restore drill using template and evidence attachment

## Evidence Storage Rules
1. Keep completed manual test logs in Docs/Guide/Testing-Logs/.
2. Keep restore drill reports in Docs/Compliance/Backup-Drills/.
3. Keep at least 3 months of test evidence in repository docs.

## Minimum Release Gate (Solo Founder)
A release is allowed only if:
1. verify:pre-release passes.
2. Manual smoke test log is completed for affected modules.
3. No open critical regression in authentication, messaging, or data isolation.

## Next Improvements (Optional, Low-Cost)
1. Add CI job for verify:pre-release.
2. Add scripted API smoke test file for auth/crm/orders/templates.
3. Add monthly audit-log review checklist.
