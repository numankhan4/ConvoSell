# Backup Encryption and Recovery Policy

Version: 1.0
Last updated: 2026-04-08
Owner: Founder / Platform Owner

## Purpose
Define low-cost but defensible controls for backup encryption and recovery evidence required for Shopify protected data assessment.

## Scope
Applies to production data stores containing customer and operational data, including:
- primary application database
- automated backups/snapshots
- backup restore processes and evidence artifacts

## Policy Statements
1. Backup encryption is required for all production backups.
2. Backup data must remain encrypted at rest throughout retention.
3. Recovery capability must be validated through periodic restore drills.
4. Evidence of encryption and restore testing must be retained.

## Startup Cost-Control Mode
1. Prefer hosting-provider included backup encryption and snapshot features.
2. Do not purchase additional backup vendors unless current provider cannot meet encryption + restore evidence needs.
3. Any paid backup tooling requires spend-gate approval (need, alternative, cap, review date).

## Required Evidence
Collect and maintain:
1. Provider-level proof that backups are encrypted at rest.
- acceptable evidence: dashboard screenshots, provider documentation excerpt, support confirmation
2. Backup retention configuration evidence.
- acceptable evidence: backup window and retention settings screenshot/export
3. Restore drill evidence.
- acceptable evidence: date, actor, source backup, restore target, result, issues, remediation owner

## Retention for Evidence
- Keep backup encryption and restore evidence for minimum 12 months.

## Roles and Responsibilities
- Founder / Platform Owner:
  - validates backup settings quarterly
  - runs or assigns restore drill
  - stores evidence in Docs/Compliance
- Engineering Owner:
  - validates application functionality after restore

## Review Cadence
- Quarterly review of backup encryption settings
- Quarterly restore drill execution
- Immediate review after major infrastructure changes

## Compliance Mapping (Shopify Assessment)
- Encrypt backups: supported by provider proof + this policy + drill evidence
- Incident readiness: supported by documented recovery process and drill results
