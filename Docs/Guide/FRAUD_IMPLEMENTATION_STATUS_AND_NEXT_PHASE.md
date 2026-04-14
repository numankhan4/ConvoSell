# Fraud Module Implementation Status and Next Phase Plan

This document summarizes what has been implemented in the new fraud module so far, and the plan for the next phase.

## 1) Objective

Build a production-grade, explainable fraud scoring system for Shopify/COD order risk reduction with:
- Real-time scoring and recommendations
- Async auto-check pipeline via outbox + worker
- Persisted fraud assessments/signals for audit and analytics
- Frontend visibility for operations teams

## 2) What Has Been Implemented So Far

## 2.1 Backend Fraud Domain

A new fraud module is implemented in backend with:
- Controller endpoints for single check, batch check, reports, summaries, and internal worker check.
- Service logic for multi-detector scoring.
- Explainable output (reasons, detector breakdown, signals).
- Persistence of each assessment and signal record.
- Decision audit trail.

Implemented detectors include:
- Duplicate/velocity patterns (phone/address/device)
- Phone quality and pattern risk
- COD/order value and customer history risk
- Trust/history scoring
- Optional geo mismatch risk
- WhatsApp verification behavior risk (confirmation status, no-reply timeout windows, follow-up saturation)

Recent reliability and quality improvements:
- Duplicate detector now flags second order reuse in 24h (not only third+).
- Reports and summaries auto-backfill missing fraud assessments for unchecked orders.
- Fraud recommendation can explicitly suggest WhatsApp follow-up when verification is still pending.

Current decision outcomes:
- APPROVE
- VERIFY
- BLOCK

## 2.2 Fraud API Endpoints

Implemented endpoints:
- POST /api/fraud/check
- POST /api/fraud/check-batch
- GET /api/fraud/report/:orderId
- GET /api/fraud/summaries
- POST /api/fraud/internal/check (worker/internal key)

## 2.3 Data Model and Persistence

Prisma schema and migration were added for:
- FraudRuleConfig
- FraudAssessment
- FraudSignal
- PhoneFingerprint
- AddressFingerprint
- DeviceFingerprint
- FraudDecisionAudit

Persistence behavior:
- Every fraud check stores an assessment row.
- Detector signals are stored for explainability.
- Decision changes are captured in audit records.
- Fingerprint tables are maintained for recurring patterns.

## 2.4 Event/Worker Integration

Automatic fraud checking pipeline is implemented:
- On order creation, backend emits outbox event: order.fraud_check
- Worker consumes order.fraud_check
- Worker calls internal fraud endpoint with internal key
- Fraud result is persisted in backend database

## 2.5 Frontend Implementation

Orders dashboard integration includes:
- Per-order Check Fraud action
- View Fraud Report modal
- Fraud decision/score badges in list
- Fraud filter chips (All, Approve, Verify, Block, Unchecked)
- Batch action for visible unchecked orders

Persistence on reload improvements:
- Orders API response includes latest fraud summary
- Frontend restores fraud state from multiple shapes:
  - order.fraudSummary
  - latest order.fraudAssessments entry
  - cached UI fraud map

This was added to prevent status reverting to "Not checked" after page reload.

## 2.6 Configuration and Runbook

Operational setup and smoke-test guide created:
- Docs/Guide/FRAUD_SETUP_AND_TEST.md

Includes:
- Required env vars for backend/worker
- Migration steps
- Direct API smoke test
- Outbox/worker path smoke test
- Data verification checks

## 2.7 Build and Validation Status

Verified during implementation:
- Backend build passes
- Frontend build passes
- Queue path and direct path have been exercised
- Fraud results are persisted and can be reported
- Backend build passes after verification-detector enhancements

## 3) Current Limitations / Known Gaps

Areas still to harden for enterprise production:
- Rule management UI for non-developer tuning of thresholds/weights
- Versioned policy publishing workflow (draft -> approve -> rollout)
- Alerting and monitoring dashboards for fraud outcomes
- Case management workflow for VERIFY/BLOCK decisions
- More advanced anomaly models beyond deterministic rule heuristics
- Performance optimization for very high order volume
- Expanded test coverage (integration + load + regression)

Notes on WhatsApp verification coverage now included in fraud scoring:
- verificationOutcome = confirmed, cancelled, fake_suspected
- Pending response windows based on workspace verification settings
- Inbound reply presence after confirmation prompt
- Follow-up exhaustion patterns and slow confirmation behavior

## 4) Next Phase Plan (Phase 2)

## Phase 2A: Rule Governance and Controls
- Add admin APIs for fraud policy configuration per workspace
- Add policy versioning and rollback support
- Add rollout modes with guardrails and approval flow

## Phase 2B: Operational Workflows
- Add fraud review queue UI for VERIFY/BLOCK
- Add analyst actions: approve, reject, request verification
- Add full case notes and audit timeline per order

## Phase 2C: Observability and Reporting
- Add fraud KPI dashboard:
  - decision distribution
  - false-positive trends
  - savings estimation
  - detector contribution trends
- Add alerting for sudden fraud spikes
- Add scheduled fraud reports export

## Phase 2D: Model and Signal Expansion
- Add more signals:
  - disposable phone/email heuristics
  - delivery-zone mismatch intelligence
  - temporal behavior anomalies
- Introduce weighted model versioning (v2) with shadow A/B evaluation

## Phase 2E: Reliability and Scale
- Add queue retry policy hardening and dead-letter handling
- Add idempotency tokens for fraud checks
- Add caching for hot summaries
- Add query/index tuning for large datasets

## Phase 2F: Quality and Security
- Add full test suite:
  - detector unit tests
  - endpoint integration tests
  - worker contract tests
- Add security hardening:
  - stricter internal endpoint controls
  - secrets rotation support
  - abuse/rate limiting controls

## 5) Suggested Execution Order

Recommended implementation order:
1. Rule governance APIs + admin UI (Phase 2A)
2. Fraud review operations UI and case workflow (Phase 2B)
3. KPI and alerting observability stack (Phase 2C)
4. Additional signals and model versioning (Phase 2D)
5. Scale/reliability hardening (Phase 2E)
6. Final security and test hardening sweep (Phase 2F)

## 6) Definition of Done for Next Phase

Phase 2 is considered complete when:
- Fraud policies are manageable by admins without code changes
- VERIFY/BLOCK decisions are handled through review workflow
- Fraud metrics and alerts are visible and actionable
- Model changes are versioned with safe rollout and rollback
- Queue + API path are resilient under load
- Automated tests cover core fraud behavior and regressions
