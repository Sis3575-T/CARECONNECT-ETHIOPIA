# CareConnect Ethiopia — Database Backup & Disaster Recovery Runbook

## 1. Executive Summary & Recovery Objectives

CareConnect Ethiopia leverages a dual backup and disaster recovery architecture:
1. **Primary Cloud Layer (Neon PostgreSQL)**: Continuous Write-Ahead Log (WAL) streaming to durable object storage with copy-on-write branching and point-in-time recovery (PITR).
2. **Secondary Air-Gapped Layer (Logical Backups)**: Scheduled encrypted schema and sanitized data exports with cryptographic SHA-256 manifests.

### Operational Recovery Targets (Configurable Baseline)

| Metric | Target Window | Mechanism |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 1 hour** | Continuous WAL archiving provides near-instantaneous recovery points; secondary logical snapshots occur daily. |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | Neon copy-on-write branching provisions restored database instances in under 2 minutes; logical restores complete within 15 minutes. |

---

## 2. Neon Cloud Backup & Point-in-Time Recovery (PITR)

### 2.1 Storage Architecture
Neon decouples compute from storage:
- **Compute nodes**: Stateless PostgreSQL instances running on Kubernetes.
- **Pageservers**: Distributed storage nodes receiving PostgreSQL WAL records.
- **Safekeepers**: Redundant consensus cluster validating all WAL transactions before acknowledging commit.
- **Durable Storage**: All historical WAL segments and immutable checkpoints are stored in multi-AZ cloud object storage (AWS S3).

### 2.2 Point-In-Time Restoration Procedure
If accidental data modification occurs (e.g. erroneous updates or corrupted referrals), follow this procedure:

1. **Identify the Incident Timestamp**:
   Determine the exact target time prior to the incident (e.g., `2026-11-07T08:45:00Z`).

2. **Create a Restored Branch via Neon CLI**:
   ```bash
   neon branches create \
     --project-id <PROJECT_ID> \
     --name recovery-branch-20261107 \
     --from-timestamp "2026-11-07T08:45:00Z"
   ```

3. **Verify Data Integrity on Restored Branch**:
   Connect to the recovery branch and run integrity checks:
   ```bash
   DATABASE_URL="postgresql://user:pass@recovery-branch.neon.tech/careconnect_db" \
   npm test
   ```

4. **Promote Recovery Branch to Production**:
   Switch the application environment `DATABASE_URL` in production or promote the branch via Neon management console:
   ```bash
   neon branches set-primary recovery-branch-20261107
   ```

---

## 3. Secondary Logical Backups & Verification

### 3.1 Logical Backup Generation
Run the automated backup utility to create a versioned snapshot with an integrity manifest:
```bash
node scripts/backup-db.js
```
This utility:
- Masks all sensitive connection strings and passwords.
- Exports schema DDL and table definitions to `database/backups/`.
- Computes SHA-256 checksums.
- Generates a machine-readable manifest (`*.manifest.json`).

### 3.2 Manifest Verification Protocol
Run the verification tool to audit backup archives:
```bash
node scripts/verify-backup.js
```
The utility recalculates byte sizes and SHA-256 hashes, failing with a non-zero exit code if tampering or bit rot is detected.

---

## 4. Disaster Recovery Scenarios & Procedures

### Scenario 1: Accidental Record Modification / Deletion
- **Response**: Use Neon PITR to create a recovery branch at timestamp `(T - 5 minutes)`. Export only the affected table records and re-insert into the primary production database.

### Scenario 2: Failed Database Migration
- **Response**:
  1. PostgreSQL DDL is transactional; the failing migration automatically rolls back via `ROLLBACK`.
  2. Inspect `database/migrate.js --status` to identify the failing migration script.
  3. Fix the syntax or constraint error.
  4. Re-run `node database/migrate.js`.

### Scenario 3: Cloud Availability Zone Outage
- **Response**: Neon compute nodes automatically reschedule across surviving availability zones. Since Pageservers and S3 storage are multi-AZ, zero data loss occurs.

### Scenario 4: Logical Corruption or Compromise
- **Response**:
  1. Immediately terminate active web sessions.
  2. Spin up an isolated new database instance from the last verified secondary backup manifest.
  3. Replay validated audit logs from `audit_logs` up to the point of compromise.
  4. Perform verification suite (`npm test`) before redirecting production traffic.

---

## 5. Security & Privacy Controls
- Backup files MUST NEVER be stored in public web-accessible directories (`public/`, `dist/`).
- Local backup directories (`database/backups/`) are strictly `.gitignore`'d.
- Passwords, access tokens, and session secrets are NEVER logged in backup manifests or console outputs.
