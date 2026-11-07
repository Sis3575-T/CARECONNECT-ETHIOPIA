# CareConnect Ethiopia — Data Retention & Archival Architecture

## 1. Archival & Retention Philosophy

In mission-critical national healthcare infrastructure, patient records, clinical referrals, and medical audit trails must be preserved to guarantee longitudinal patient care and accountability:

1. **Non-Destructive Archival**: Operational closure or completion of a referral never leads to physical deletion of the clinical record. Historical referrals, clinical decisions, and status transitions remain queryable.
2. **Referential Integrity Protection**: Archiving a referral records metadata in `archived_referrals_catalog` pointing to the unchanged primary record with `ON DELETE RESTRICT`. Foreign keys from documents, events, and feedback remain intact.
3. **Regulatory Neutrality Disclaimer**: The configured retention periods (e.g. 7 years for audit trails, 1 year for closed referrals before cold-tier archival) represent **baseline operational engineering targets**. They do not constitute or claim formal compliance with Ethiopian statutory regulations or specific medical records proclamation mandates.

---

## 2. Retention Policies Catalog

| Entity Type | Retention Duration | Target Action | Description & Operational Justification |
|---|---|---|---|
| `AUDIT_LOGS` | 2,555 days (~7 years) | `ARCHIVE` | Long-term operational retention for forensic and access auditing. |
| `SYSTEM_EVENTS` | 2,555 days (~7 years) | `ARCHIVE` | System security event records tracking access violations and credential changes. |
| `CLOSED_REFERRALS` | 365 days (~1 year) | `ARCHIVE` | Window following clinical closure before a referral becomes eligible for cold-tier archival. |
| `CANCELLED_REFERRALS` | 180 days (~6 months) | `ARCHIVE` | Window following clinical cancellation before archival eligibility. |
| `SUPERSEDED_DOCUMENTS` | 365 days (~1 year) | `ARCHIVE` | Historical document versions replaced by newer uploads. |
| `EXPIRED_SESSIONS` | 30 days | `PURGE_EXPIRED` | Expired and revoked JWT refresh sessions and one-time password reset tokens. |

---

## 3. Cold Storage & Archival Tiers

```
┌────────────────────────────────────────────────────────┐
│               Hot Tier (Neon PostgreSQL)               │
│  Active referrals, current documents, active sessions  │
└───────────────────────────┬────────────────────────────┘
                            │
            (After retention period expires)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Warm / Archived Catalog Registry           │
│  - Table: archived_referrals_catalog                   │
│  - Table: data_retention_executions (Audit Log)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Cold Archival Tiers                   │
│  - COLD_STORAGE: Compressed object storage             │
│  - PARTITION_ARCHIVE: Read-only database partition     │
│  - OFFLINE_BLOB: Long-term encrypted backup archives   │
└────────────────────────────────────────────────────────┘
```

---

## 4. Referential Action Integrity

- `referrals` -> `archived_referrals_catalog`: `ON DELETE RESTRICT` (Guarantees active or historical referrals cannot be silently dropped).
- `data_retention_policies` -> `data_retention_executions`: `ON DELETE SET NULL` (Preserves execution audit history even if policy parameters are modified).
- Historical documents reference `referral_documents` version trees without breaking parent links.
