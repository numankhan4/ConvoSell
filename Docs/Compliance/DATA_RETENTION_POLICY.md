# Data Retention Policy

## Policy Goal
Retain personal data only for required business and legal purposes.

## Recommended Retention Baseline
- Messages and conversations: 12 months from last activity.
- Contacts and customer profile fields: while merchant workspace is active, then remove within 30 days after account termination unless legally required.
- Orders and payment-related records: 24 months minimum for operational and dispute needs.
- Audit logs: 12 months minimum.
- Webhook event idempotency records: 90 days.

## Deletion Workflow
1. Mark data for deletion.
2. Execute hard delete or anonymization.
3. Log completion event.
4. Verify backups expire per retention window.

## Exceptions
Legal hold, fraud investigations, and statutory requirements may override default timelines.

## Ownership
Security/compliance owner reviews this policy quarterly.

## Action Required
Align application jobs and scripts to enforce these periods automatically.
