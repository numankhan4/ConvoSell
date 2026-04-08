# Shopify Protected Data: External Action Checklist

Last updated: 2026-04-08

## Purpose
Track all non-code actions required to substantiate Shopify protected data assessment answers with evidence.

## Startup Constraint (Cost-Minimizing)

Apply this rule across all actions:
1. Choose free/included options first.
2. Defer paid vendors unless required for a blocking compliance control or customer commitment.
3. Approve recurring spend only with a monthly cap and review date.

## Legal and Policy Publication

Action: Approve and publish privacy policy
- Owner: Legal + Product Owner
- Evidence required: published URL, version/date, approval note
- Deadline target: Week 1
- Direct cost: Optional (can publish internal draft first and add legal review later)
- Pricing impact: Add fixed compliance overhead to paid plan base fees

Action: Approve and publish merchant DPA
- Owner: Legal + Founder
- Evidence required: final DPA PDF/template and acceptance flow
- Deadline target: Week 1
- Direct cost: Optional (start with template + plain-language commitments)
- Pricing impact: Add enterprise/compliance servicing overhead

## Infrastructure and Security Operations

Action: Confirm DB encryption at rest and backup encryption
- Owner: DevOps/Infra
- Evidence required: provider statement/screenshots/config export
- Deadline target: Week 2
- Direct cost: Usually zero if provider already includes encrypted backups
- Pricing impact: Add resilience and storage overhead in plan COGS

Action: Define and test restore drill process
- Owner: DevOps + Engineering Manager
- Evidence required: restore drill report with date, scope, outcome, issues
- Deadline target: Week 3
- Direct cost: Time only (no tool purchase required)
- Pricing impact: Include periodic resilience labor in compliance overhead

Action: Finalize incident response operational contacts
- Owner: Security Lead + Ops Lead
- Evidence required: named responder list, escalation chain, notification templates
- Deadline target: Week 2
- Direct cost: Near-zero with manual escalation workflow (chat + phone tree)
- Pricing impact: Include security operations overhead in paid tiers

## Monitoring and DLP (If vendor-backed)

Action: Choose logging/monitoring path (basic internal vs SIEM)
- Owner: Engineering Lead
- Evidence required: architecture decision record and alert definitions
- Deadline target: Week 3
- Direct cost: zero in bootstrap mode (DB audit logs + periodic manual review)
- Pricing impact: Add log/monitoring COGS into usage and base pricing

Action: Define DLP baseline controls and policy
- Owner: Security + Engineering
- Evidence required: DLP policy document, implementation checklist
- Deadline target: Week 3
- Direct cost: zero in bootstrap mode (role guardrails + export approvals + anomaly queries)
- Pricing impact: Add monitoring/compliance burden to pricing model

## Shopify Submission Readiness

Action: Build evidence package for all Yes answers
- Owner: Compliance Coordinator
- Evidence required: checklist with links to logs, policies, screenshots, test records
- Deadline target: Week 4
- Direct cost: Internal effort
- Pricing impact: None directly, but affects go-to-market timing

Action: Re-answer questionnaire with evidence-only claims
- Owner: Product Owner + Compliance Coordinator
- Evidence required: final response copy and artifact index
- Deadline target: Week 4
- Direct cost: Internal effort
- Pricing impact: None directly

## Costing and Pricing Alignment Actions

Action: Build compliance cost ledger (one-time + recurring)
- Owner: Finance/Founder
- Evidence required: spreadsheet with assumptions and actuals
- Deadline target: Week 2
- Direct cost: No direct vendor cost
- Pricing impact: Foundation for repricing

Action: Define target gross margin by tier
- Owner: Founder + Finance
- Evidence required: approved margin targets and variance thresholds
- Deadline target: Week 2
- Direct cost: No
- Pricing impact: Directly sets tier prices

Action: Update pricing page and plan design
- Owner: Product + Engineering
- Evidence required: updated pricing table and backend quota mapping
- Deadline target: Week 4-5
- Direct cost: No direct vendor cost
- Pricing impact: Customer-facing pricing revision

Action: Add "cost review gate" before any new tool
- Owner: Founder
- Evidence required: one-page decision note (need, free alternative rejected, monthly cap, review date)
- Deadline target: Ongoing
- Direct cost: No
- Pricing impact: prevents unplanned COGS growth
