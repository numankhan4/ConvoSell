# Shopify Protected Customer Data: Assessment and Action Plan

## Scope

This assessment is based on current repository code and docs only.
If you have additional legal/security controls outside this repo, update answers accordingly.

## Evidence Snapshot

Implemented evidence found:
- Password hashing with bcrypt in auth service.
- JWT auth, route guards, RBAC permissions, tenant isolation patterns.
- AuditLog model exists and selected audit events are written.
- Rate limiting and request validation configured.
- HTTPS is used for external API calls (Shopify/Meta).
- Soft-delete/grace-period patterns exist for integrations.

Gaps/uncertain from repository evidence:
- No dedicated Privacy Policy / DPA files found in workspace docs.
- No explicit incident response policy doc found.
- No explicit backup encryption policy/proof found.
- Token encryption at rest is marked TODO in docs/comments.
- No explicit data retention policy document for all personal data classes.
- No explicit data loss prevention strategy document found.
- Access logging is partial (event logs exist), not a full personal-data access trail.

## Recommended Selections (Conservative, Evidence-Based)

### Purpose
1. Process minimum personal data required: **Yes**
- Reason: App functions are scoped to CRM/order workflows; data model is purpose-bound.

2. Tell merchants what personal data is processed and purpose: **No** (or **Yes** only if you have external published policy)
- Reason: No policy/DPA artifacts were found in repo docs.

3. Limit use of personal data to stated purpose: **Yes**
- Reason: Current features are operational CRM/order messaging and sync.

### Consent
4. Privacy/data protection agreements with merchants: **No** (or **Yes** if already published externally)
- Reason: No DPA/privacy agreement artifacts found in repo.

5. Respect and apply customer consent decisions: **Not applicable** (current app scope)
- Reason: No consent-state ingestion/processing flow found in code.

6. Respect and apply customer opt-out of data sale: **Not applicable**
- Reason: No data-sale feature or broker/share flow found.

7. Automated decision-making with legal/significant effects + opt-out: **Not applicable**
- Reason: No such decision engine found in current system.

### Storage
8. Retention periods to avoid over-retention: **No** (or **Yes** if you have formal external retention policy)
- Reason: Some grace-period logic exists, but no complete retention policy found.

9. Encrypt data at rest and in transit: **No** (conservative)
- Reason: In-transit largely yes; at-rest controls and token encryption not fully evidenced in repo.

10. Encrypt backups: **No** (unless your infra guarantees this and is documented)
- Reason: No backup policy proof found in repo.

11. Separate test and production data: **Yes** (if operationally separated in environments)
- Reason: Standard env separation exists; confirm infra practice.

12. Data loss prevention strategy: **No**
- Reason: No DLP policy/control doc found.

### Access
13. Limit staff access to personal data: **Yes**
- Reason: RBAC, permission guards, role checks implemented.

14. Strong password requirements for staff: **No** (conservative)
- Reason: Min length exists, but no strong complexity policy enforcement found.

15. Log access to personal data: **No** (conservative)
- Reason: Audit logs exist for key actions, not full personal-data access logging coverage.

16. Security incident response policy: **No**
- Reason: No incident response policy artifact found.

### Audits and certifications
17. Third-party audits/certifications: 
- Suggested entry: "No third-party certifications currently. Security controls are being formalized."

## If You Prefer a Higher-Approval Submission

If you already have the following outside this repo, switch those answers to **Yes** and keep links/evidence ready:
- Privacy Policy + DPA with merchants
- Written retention policy
- At-rest encryption and encrypted backups confirmation from infrastructure
- Incident response policy
- Staff password standard and enforcement evidence
- Access logging policy and samples

## Action Plan to Improve and Move More Answers to Yes

### Phase 1 (1-2 weeks)
1. Publish legal docs:
- Privacy Policy
- Data Processing Addendum (DPA)
- Merchant-facing data-use summary

2. Formalize security policies:
- Incident response policy
- Data retention policy (by data class: contacts, orders, messages, logs)
- Access control policy

3. Immediate code hardening:
- Encrypt stored integration tokens/credentials at application layer.
- Add password complexity validation.

### Phase 2 (2-4 weeks)
1. Logging and monitoring:
- Add explicit personal-data access audit events (read/write/export).
- Centralize audit logging dashboard and retention controls.

2. Backup and recovery:
- Document backup encryption and restore testing cadence.
- Add evidence artifacts for compliance responses.

3. Consent/opt-out readiness:
- Define how consent/opt-out signals are ingested and enforced (if future scope includes marketing).

### Phase 3 (4-8 weeks)
1. Compliance readiness:
- Internal control checklist mapped to Shopify Level 1/2 requirements.
- Run internal security review and collect evidence package.

2. Optional certifications:
- Begin SOC 2 / ISO 27001 readiness path if needed for enterprise sales.

## Ready-to-Use Notes for Shopify Review

Use accurate language:
- "Current functionality supports merchant customer service and order operations via WhatsApp CRM workflows."
- "We process only data necessary for order and support workflows."
- "We are formalizing additional data protection controls and documentation as part of ongoing compliance improvements."

Do not claim controls you cannot evidence.

## Best-Chance Submission (After Creating Compliance Docs)

If you adopt and publish these documents:
- Docs/Compliance/PRIVACY_POLICY_DRAFT.md
- Docs/Compliance/DPA_TEMPLATE_SUMMARY.md
- Docs/Compliance/DATA_RETENTION_POLICY.md
- Docs/Compliance/INCIDENT_RESPONSE_POLICY.md

Then use this stronger selection set:

1. Minimum personal data required: **Yes**
2. Tell merchants what data and why: **Yes**
3. Limit use to that purpose: **Yes**
4. Privacy/data protection agreements with merchants: **Yes**
5. Respect customer consent decisions: **Not applicable** (unless explicit consent system is implemented)
6. Respect opt-out of data sale: **Not applicable**
7. Automated legal/significant decisions opt-out: **Not applicable**
8. Retention periods defined: **Yes**
9. Encrypt data at rest and in transit: **No** (keep conservative until at-rest controls are fully evidenced)
10. Encrypt backups: **No** (until infra evidence exists)
11. Separate test and production data: **Yes**
12. Data loss prevention strategy: **No** (until formal DLP controls are documented)
13. Limit staff access to personal data: **Yes**
14. Strong password requirements for staff: **No** (until complexity policy/enforcement is added)
15. Log access to personal data: **No** (until broader personal-data access logging is implemented)
16. Security incident response policy: **Yes**
17. Third-party audits/certifications: "No third-party certifications currently."

### Immediate Next Improvements to Move More Answers to Yes

1. Implement token/application-field encryption at rest.
2. Document and verify backup encryption controls.
3. Enforce strong staff password policy (complexity + rotation where needed).
4. Expand audit coverage for personal-data reads/exports.
5. Publish a formal DLP standard and monitoring controls.
