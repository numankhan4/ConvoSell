# Data Loss Prevention (DLP) Policy

Last updated: 2026-04-20
Owner: Founder / Security Owner
Applies to: WhatsApp CRM platform (backend, frontend, worker, operational tooling)

## 1) Purpose

This policy defines baseline controls to reduce accidental or unauthorized exposure of personal and sensitive business data.

## 2) Data classes in scope

1. Personal data: name, phone number, email, order delivery details.
2. Sensitive integration secrets: Shopify client secret/access tokens, WhatsApp access/refresh tokens, webhook verify tokens.
3. Operational logs and exports containing personal data.

## 3) Allowed data flows

1. Internal API use within authenticated workspace context.
2. Controlled export endpoints for authorized roles only.
3. Partner platform API exchange (Shopify/Meta) over HTTPS.
4. Encrypted backup/storage controls at provider and app layers.

## 4) Prohibited actions

1. Logging plaintext secrets/tokens to application logs.
2. Exporting personal data without proper role permission.
3. Sharing raw exports over unmanaged channels.
4. Storing copied production data in unsecured local files.

## 5) Technical controls

1. Secret encryption at rest:
- Application secrets are encrypted using app-layer encryption.
- One-time migration script exists to encrypt legacy plaintext rows.

2. Export permission controls:
- Contacts export requires contacts export permission.
- Orders export requires orders export permission.

3. Export activity auditing:
- Each export writes auditable events (action, workspace, metadata, count).

4. Unusual export alerting:
- System raises `dlp.export_alert.warning` when export activity exceeds configured thresholds in rolling windows.
- Default thresholds:
  - event threshold: 5 exports in 24h
  - record threshold: 1000 exported records in 24h
- Environment overrides:
  - DLP_EXPORT_ALERT_WINDOW_HOURS
  - DLP_EXPORT_ALERT_THRESHOLD
  - DLP_EXPORT_RECORD_THRESHOLD

5. Audit retention:
- Audit logs are retained and cleaned automatically by retention policy.
- Default retention: 365 days (configurable via AUDIT_LOG_RETENTION_DAYS).

## 6) Operational response

When `dlp.export_alert.warning` is raised:

1. Review workspace export actions in audit logs.
2. Validate actor legitimacy and business purpose.
3. Temporarily restrict export permissions if misuse is suspected.
4. Document incident notes and remediation in runbook records.

## 7) Evidence and review cadence

1. Monthly review of DLP alert events.
2. Quarterly review of export permission mappings.
3. Quarterly validation of backup + audit retention controls.
4. Keep evidence links in compliance folder and submission checklist.

## 8) Related docs

1. Docs/Compliance/SECURITY_GAP_CLOSURE_TICKETS.md
2. Docs/Guide/RUNBOOK_PROD.md
3. Docs/Guide/SHOPIFY_SUBMISSION_READINESS_MATRIX.md
