# Security Gap Closure Tickets

## Goal
Close the current Shopify data protection questionnaire gaps and move these answers from No to Yes:
- Encrypt data at rest and in transit
- Encrypt backups
- Data loss prevention strategy
- Strong password requirements for staff
- Log access to personal data

## Ticket 1: Application-Level Encryption at Rest

Status: In progress (Shopify and WhatsApp token/secret encryption write/read coverage implemented; migration script now supports dry-run/reporting for safe evidence; automated regression checks in place)

### Problem
Sensitive integration secrets are stored as plain values in database fields.

### Scope
- Encrypt/decrypt secrets before database write/read in backend services.
- Cover Shopify and WhatsApp secret/token fields first.

### Implementation Tasks
1. Add encryption utility with managed key support (environment variable KMS/app key).
2. Wrap read/write flows in settings and OAuth services.
3. Add migration strategy for existing plaintext rows.
4. Add unit tests for encrypt/decrypt and backward compatibility.

### Affected Areas
- backend/src/settings/settings.service.ts
- backend/src/shopify/oauth/shopify-oauth.service.ts
- backend/src/whatsapp/whatsapp.service.ts

### Acceptance Criteria
- New secrets are encrypted before persistence.
- Existing plaintext values are migrated and readable after deployment.
- No plaintext secrets appear in logs.

### Estimate
- 2 to 3 days

## Ticket 2: Backup Encryption Controls and Evidence

Status: In progress (backup encryption policy and restore drill template added; live drill evidence pending)

### Problem
Backup encryption is not documented with verifiable evidence.

### Scope
- Confirm provider-level backup encryption and retention settings.
- Document restore process and quarterly test evidence.

### Implementation Tasks
1. Document backup architecture and encryption method in compliance docs.
2. Add quarterly backup restore drill checklist and log template.
3. Store backup evidence references in compliance folder.

### Acceptance Criteria
- Written proof of encrypted backups exists.
- Restore drill runbook exists with assigned owner and schedule.

### Estimate
- 1 day

## Ticket 3: Strong Password Policy Enforcement

Status: Completed (registration and reset complexity validation implemented with automated test coverage)

### Problem
Only minimum length is enforced; complexity rules are not.

### Scope
- Add strong password validation in registration and reset flows.

### Implementation Tasks
1. Update password validation rules in auth DTOs:
   - minimum length 12
   - uppercase, lowercase, number, special character
2. Add user-friendly validation error messages.
3. Add tests for accepted and rejected password patterns.

### Affected Areas
- backend/src/auth/dto/auth.dto.ts
- backend/src/auth/auth.service.ts

### Acceptance Criteria
- Weak passwords are rejected by API validation.
- Existing users can still log in without forced reset.

### Estimate
- 0.5 to 1 day

## Ticket 4: Personal Data Access Audit Logging Expansion

Status: In progress (Orders + CRM + admin/reporting read-access events implemented; export coverage implemented; automated retention cleanup added; evidence report script supports workspace/action/user filtering)

### Problem
Audit logs exist for selected actions but not complete personal-data access coverage.

### Scope
- Log personal-data read/export access for contacts, orders, messages.

### Implementation Tasks
1. Define personal-data access event schema.
2. Add audit writes for read endpoints and export endpoints.
3. Include actor, workspace, action, resource id, timestamp, and purpose metadata.
4. Add retention rule for audit log records.

### Affected Areas
- backend/src/orders/orders.service.ts
- backend/src/crm (relevant services/controllers)
- backend/src/common/audit logging call sites

### Acceptance Criteria
- Personal-data reads/exports generate auditable events.
- Queries can filter by user, workspace, and action.

### Estimate
- 2 days

## Ticket 5: Data Loss Prevention Strategy

Status: In progress (DLP policy published; export audit + unusual export alert controls implemented; incident linkage active)

### Problem
No formal DLP strategy is currently documented and operationalized.

### Scope
- Define and implement baseline DLP controls.

### Implementation Tasks
1. Create DLP policy doc with allowed data flows and prohibited actions.
2. Add guardrails:
   - prevent secrets in logs
   - restrict bulk export by role
   - alert on unusual export volume
3. Add incident playbook linkage to DLP events.

### Affected Areas
- Docs/Compliance
- backend/src/common/constants/permissions.constants.ts
- export-related endpoints

### Acceptance Criteria
- DLP policy published and approved.
- Technical controls active for logging, export restrictions, and alerts.

### Estimate
- 2 to 4 days

## Delivery Plan

### Phase 1 (Week 1)
1. Ticket 1: Encryption at rest
2. Ticket 3: Strong password enforcement

### Phase 2 (Week 2)
1. Ticket 4: Access audit expansion
2. Ticket 2: Backup encryption evidence
3. Ticket 5: DLP strategy and controls

## Definition of Done

All five controls are implemented, documented, tested, and reviewable so questionnaire answers can be updated from No to Yes with supporting evidence.
