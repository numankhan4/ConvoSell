# Backup Restore Drill Template

Use this template each quarter and store one completed copy per drill.

## Drill Metadata
- Drill date:
- Environment:
- Owner:
- Participants:
- Trigger type: scheduled / ad-hoc

## Backup Source
- Data source:
- Backup/snapshot identifier:
- Backup timestamp:
- Encryption evidence reference:

## Restore Target
- Target environment:
- Isolation confirmed: yes/no
- Restore start time:
- Restore end time:

## Validation Checklist
1. Restore completed without critical errors: yes/no
2. Application can connect to restored database: yes/no
3. Core read operations work (orders, contacts, messages): yes/no
4. Authentication works: yes/no
5. No cross-tenant data leakage observed: yes/no
6. Data integrity spot checks passed: yes/no

## Metrics
- Restore duration:
- Estimated RTO achieved:
- Estimated data currency (RPO):

## Findings
- Issues found:
- Severity per issue:
- Root cause summary:

## Remediation Plan
- Action item:
- Owner:
- Due date:
- Status:

## Sign-off
- Drill owner sign-off:
- Date:
- Next scheduled drill date:
