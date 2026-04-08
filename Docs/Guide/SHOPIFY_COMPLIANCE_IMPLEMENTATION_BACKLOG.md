# Shopify Protected Data: Implementation Backlog (Execution)

Last updated: 2026-04-08

## Objective
Move Shopify Protected Customer Data assessment answers from No/Partial to evidence-backed Yes where feasible, without over-claiming controls.

## Startup Cost-Control Mode (Solo Founder)

Rules:
1. Prefer zero-cost implementation first. Add paid tooling only when a control cannot be reasonably evidenced without it.
2. Use built-in/cloud-included capabilities before buying vendors (DB encryption defaults, platform logs, object storage lifecycle rules).
3. Defer non-blocking certifications and enterprise tooling until revenue justifies spend.
4. Keep manual/operational controls where acceptable for current scale, with documented owner and cadence.

Mandatory spend gate:
1. Any new recurring tool spend requires a short decision note with:
- compliance requirement it satisfies
- free alternative considered and why insufficient
- monthly cost ceiling
- expected date to re-evaluate

## Workstream 1: Policy and Evidence Baseline

Task 1.1: Finalize privacy policy for publication
- Scope: complete placeholders and legal language in Docs/Compliance/PRIVACY_POLICY_DRAFT.md.
- Deliverable: approved policy version with owner/signoff/date.
- External action required: yes (legal review and approval).
- Direct cost impact: optional (use internal draft first; external legal review can be deferred if acceptable for current risk stage).
- Pricing impact: include recurring legal/compliance maintenance overhead in plan base fee.

Task 1.2: Finalize merchant DPA template
- Scope: convert Docs/Compliance/DPA_TEMPLATE_SUMMARY.md into merchant-usable DPA.
- Deliverable: versioned DPA with acceptance workflow.
- External action required: yes (legal review).
- Direct cost impact: optional (start with template and plain-language terms; defer paid legal polish until enterprise deals require it).
- Pricing impact: include enterprise contract overhead as add-on margin.

Task 1.3: Publish compliance evidence index
- Scope: maintain a single evidence register for Shopify submission artifacts.
- Deliverable: evidence index document with links/screenshots/log excerpts.
- External action required: no.
- Direct cost impact: no (internal effort only).
- Pricing impact: no immediate pricing change.

## Workstream 2: Security Hardening

Task 2.1: Enforce strong password policy (started)
- Scope: registration validation requires minimum 12 chars and complexity.
- Deliverable: backend validation deployed.
- External action required: no.
- Direct cost impact: no.
- Pricing impact: no.
- Status: in progress (backend validation implemented).

Task 2.2: Encrypt secrets at rest in application layer
- Scope: encrypt/decrypt WhatsApp and Shopify token/secret fields in service read/write paths.
- Deliverable: encrypted persistence for new writes + compatibility for existing plaintext rows.
- External action required: yes (production key-management decision and secret provisioning).
- Direct cost impact: avoidable initially (use app-managed encryption key via environment variable). Paid KMS can be deferred to growth stage.
- Pricing impact: include key-management and operational security cost into base platform fee.

Task 2.3: Key rotation and migration runbook
- Scope: define key versioning, rotation cadence, rollback plan.
- Deliverable: runbook with owner and quarterly rotation check.
- External action required: yes (infra/security operations).
- Direct cost impact: low/avoidable (manual quarterly rotation process is acceptable at current scale).
- Pricing impact: add fixed compliance operations overhead to all paid tiers.

## Workstream 3: Personal Data Access Logging

Task 3.1: Standardize personal-data audit event schema
- Scope: read/write/export/delete/deny/impersonate event fields.
- Deliverable: schema spec and helper utility.
- External action required: no.
- Direct cost impact: no direct vendor cost.
- Pricing impact: indirect via log volume.

Task 3.2: Implement audit log coverage in high-risk modules
- Scope: orders, CRM, messages, export endpoints.
- Deliverable: auditable records for personal-data actions.
- External action required: no.
- Direct cost impact: avoidable initially (store audit logs in primary DB with retention policy; defer SIEM).
- Pricing impact: include log storage/monitoring in variable COGS and usage tiers.

## Workstream 4: Backup, Recovery, and Incident Readiness

Task 4.1: Document encrypted backup controls and proof
- Scope: provider-level encryption, retention, and recovery points.
- Deliverable: backup control document + evidence attachments.
- External action required: yes (hosting provider confirmation).
- Direct cost impact: often avoidable (use provider-included backup encryption and evidence export).
- Pricing impact: include backup/storage resilience cost in plan floor.

Task 4.2: Quarterly restore drill
- Scope: execute and document restore simulation.
- Deliverable: signed drill report and remediation list.
- External action required: yes (operations execution).
- Direct cost impact: low (time only; no required vendor spend).
- Pricing impact: include resilience labor as compliance overhead.

Task 4.3: Operational incident response playbook
- Scope: convert policy into role-based runbook with escalation contacts.
- Deliverable: tested playbook and notification templates.
- External action required: yes (on-call ownership and communication contacts).
- Direct cost impact: low/avoidable (runbook + manual escalation channels first, paid incident tooling later).
- Pricing impact: include security operations burden in paid tiers.

## Workstream 5: Data Rights and DLP Controls

Task 5.1: Merchant data export flow
- Scope: asynchronous export for contacts/orders/messages with audit trail.
- Deliverable: API + worker job + secure artifact delivery.
- External action required: possibly (email/storage provider setup).
- Direct cost impact: low/avoidable (on-demand generation + short-lived local/object storage links; no dedicated export vendor).
- Pricing impact: include export cost in usage-based component or plan limits.

Task 5.2: Merchant data deletion flow
- Scope: controlled delete workflow with grace period and audit logs.
- Deliverable: endpoint + job + evidence logs.
- External action required: no.
- Direct cost impact: low.
- Pricing impact: no immediate change.

Task 5.3: DLP baseline policy and controls
- Scope: no-secrets-in-logs, export restrictions, unusual export alerts.
- Deliverable: DLP policy and technical guardrails.
- External action required: yes (if SIEM/alerting vendor is adopted).
- Direct cost impact: avoidable initially (application guardrails + DB/audit queries + simple threshold alerts).
- Pricing impact: add monitoring security overhead into base fee.

## Pricing Plan Update Track (Parallel)

Task P1: Build compliance cost ledger
- One-time cost lines: legal setup, security implementation.
- Recurring cost lines: KMS, logging/monitoring, backup validation, policy maintenance.
- External action required: no.
- Direct cost impact: no (analysis only).
- Pricing impact: defines repricing inputs.

Task P2: Define target gross margin per tier
- Scope: choose target margin and acceptable variance bands.
- External action required: no.
- Direct cost impact: no.
- Pricing impact: yes, controls final prices.

Task P2.1: Founder-safe pricing baseline
- Scope: set minimum plan prices to ensure positive contribution margin even without scale.
- Rule: do not underprice below infrastructure + messaging + compliance operating costs.
- External action required: no.
- Direct cost impact: no.
- Pricing impact: prevents loss-making tiers.

Task P3: Update pricing page and plan limits
- Scope: update frontend/app/pricing/page.tsx and corresponding backend quota assumptions.
- External action required: no.
- Direct cost impact: no.
- Pricing impact: yes, customer-facing pricing revision.

Task P4: Introduce quarterly pricing review
- Scope: compare actual COGS vs target per tier and adjust limits/pricing.
- External action required: no.
- Direct cost impact: no.
- Pricing impact: yes, ongoing adjustment mechanism.

## Immediate Sequence (Next 5 execution steps)
1. Add audit logging to export and high-risk admin endpoints.
2. Document backup encryption proof and restore drill templates in Docs/Compliance.
3. Create plaintext-to-encrypted token migration runbook (safe rollout and rollback).
4. Add lightweight regression tests for password and encryption/decryption paths.
5. Start monthly founder cost ledger entries and apply spend gate to any new recurring tools.
