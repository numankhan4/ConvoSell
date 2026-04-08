# Shopify Submission Readiness Matrix (Evidence-Based)

Last updated: 2026-04-08
Owner: Founder
Usage: Use this file as the final source of truth when filling Shopify protected customer data submission.

## Rules
1. Mark Yes only when evidence exists and is current.
2. Mark No/In progress when control exists partially or evidence is missing.
3. Keep all evidence links in-repo and update before submission.

## Current Recommended Submission (Today)

| # | Shopify Question Area | Recommended Answer Today | Evidence Status | Evidence Links | Owner | ETA to Improve |
|---|---|---|---|---|---|---|
| 1 | Process minimum personal data required | Yes | Ready | Docs/Guide/SHOPIFY_PROTECTED_DATA_ASSESSMENT_AND_PLAN.md | Founder | - |
| 2 | Tell merchants what data and why | No (Yes after publish) | Draft only | Docs/Compliance/PRIVACY_POLICY_DRAFT.md | Founder | Publish policy page |
| 3 | Limit use to stated purpose | Yes | Ready | Docs/Compliance/PRIVACY_POLICY_DRAFT.md | Founder | - |
| 4 | Privacy/data protection agreement with merchants | No (Yes after publish/signoff) | Draft only | Docs/Compliance/DPA_TEMPLATE_SUMMARY.md | Founder | Publish/acceptance workflow |
| 5 | Respect customer consent decisions | Not applicable | Current scope N/A | Docs/Guide/SHOPIFY_PROTECTED_DATA_ASSESSMENT_AND_PLAN.md | Founder | If marketing scope added |
| 6 | Respect opt-out of data sale | Not applicable | Current scope N/A | Docs/Guide/SHOPIFY_PROTECTED_DATA_ASSESSMENT_AND_PLAN.md | Founder | If data-sale scope added |
| 7 | Automated legal/significant decisions + opt-out | Not applicable | Current scope N/A | Docs/Guide/SHOPIFY_PROTECTED_DATA_ASSESSMENT_AND_PLAN.md | Founder | If decision engine added |
| 8 | Retention periods defined | Yes (policy exists) | Policy ready; automation partial | Docs/Compliance/DATA_RETENTION_POLICY.md | Founder | Add enforcement jobs evidence |
| 9 | Encrypt data at rest and in transit | Yes (app-layer at-rest + TLS transit) | Implemented; add migration evidence | backend/src/common/utils/crypto.util.ts, backend/src/settings/settings.service.ts, backend/src/shopify/oauth/shopify-oauth.service.ts, backend/src/whatsapp/whatsapp.service.ts | Founder | Run migration pass + evidence |
| 10 | Encrypt backups | Yes (local drill) / Better: Yes with hosted proof | Local evidence ready; hosted proof pending | Docs/Compliance/BACKUP_ENCRYPTION_POLICY.md, Docs/Compliance/Backup-Drills/2026-04-Q2-DRILL-01.md | Founder | Collect hosting-provider encryption proof |
| 11 | Separate test and production data | Yes (operational) | Partial evidence | TEST_DATA_SETUP_GUIDE.md | Founder | Add hosted env proof screenshot/doc |
| 12 | Data loss prevention strategy | No (or In progress) | Baseline not formalized fully | Docs/Compliance/SECURITY_GAP_CLOSURE_TICKETS.md | Founder | Publish DLP policy + controls checklist |
| 13 | Limit staff access to personal data | Yes | Ready | backend/src/common/constants/permissions.constants.ts, backend/src/common/guards/permission.guard.ts | Founder | - |
| 14 | Strong password requirements for staff | Yes (registration path) | Implemented; expand reset flow evidence | backend/src/auth/dto/auth.dto.ts | Founder | Add reset-flow parity and test proof |
| 15 | Log access to personal data | Yes (improved coverage) | Implemented; continue expanding | backend/src/orders/orders.service.ts, backend/src/crm/crm.service.ts, backend/src/auth/auth.service.ts, backend/src/templates/templates.service.ts | Founder | Add periodic audit review evidence |
| 16 | Security incident response policy | Yes | Policy ready | Docs/Compliance/INCIDENT_RESPONSE_POLICY.md | Founder | Add named escalation contacts |
| 17 | Third-party audits/certifications | No | Accurate | Docs/Guide/SHOPIFY_PROTECTED_DATA_ASSESSMENT_AND_PLAN.md | Founder | Optional future roadmap |

## Evidence Pack Checklist (Before Submission)

1. Policy publication links live in production
- Privacy Policy URL
- DPA URL/acceptance flow

2. Security control evidence current (last 60-90 days)
- Latest backup drill report
- Restore evidence artifacts
- Security regression check output

3. Access logging evidence
- Sample audit records for read/export/admin actions

4. Encryption evidence
- Code references + migration execution notes

5. Environment evidence
- Proof of test/prod separation in hosting setup

## Minimum Gate to Submit with High Confidence

1. Questions 2 and 4 switched from No to Yes with published links.
2. Question 10 backed by hosting provider encryption proof (not local only).
3. Question 12 at least moved to In progress with formal DLP policy doc.
4. Evidence freshness within 90 days for operational controls.

## Conservative Submission Guidance

If any evidence is missing at submission time, prefer conservative answers (No/In progress) and provide improvement timeline. Do not over-claim controls you cannot demonstrate.
