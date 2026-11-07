# CareConnect Ethiopia — Database Migration Safety & Rollback Strategy

## 1. Overview
The CareConnect Ethiopia database migration engine ensures that schema transformations across all 9 domains are version-controlled, transactionally atomic, sequentially verified, and cryptographically tracked using SHA-256 checksums.

---

## 2. Migration Architecture & Checksum Verification

```
┌─────────────────────────────────┐
│     database/migrations/        │
│  001_initial_migration_tracker  │
│  002_create_roles_permissions   │
│  ...                            │
│  032_data_integrity_uniqueness  │
└────────────────┬────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│             Migration Engine (migrate.js)              │
│  1. Sequence order validation (001 -> 032 continuous)  │
│  2. SHA-256 Checksum generation                        │
│  3. Checksum drift detection against applied records   │
│  4. Transactional DDL execution (BEGIN ... COMMIT)     │
│  5. Execution timing & telemetry logging               │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│             Table: schema_migrations                   │
│  - version VARCHAR(50) UNIQUE                          │
│  - name VARCHAR(255)                                   │
│  - checksum VARCHAR(64) [SHA-256]                      │
│  - execution_time_ms INTEGER                           │
│  - status VARCHAR(20)                                  │
│  - applied_at TIMESTAMP WITH TIME ZONE                 │
└────────────────────────────────────────────────────────┘
```

---

## 3. Sequential Ordering & Integrity Rules

1. **Strict 3-Digit Prefix Convention**:
   - Every migration must begin with a 3-digit zero-padded number followed by an underscore (`001_`, `002_`, ... `032_`).
   - Gaps, duplicate prefixes, or unsorted versions cause the migration engine to abort prior to execution.

2. **Transactional DDL**:
   - PostgreSQL natively supports transactional DDL statements (`CREATE TABLE`, `ALTER TABLE`, `ADD CONSTRAINT`, `CREATE INDEX`).
   - Each migration runs inside an isolated `BEGIN ... COMMIT` block.
   - If an error occurs, the entire migration is rolled back (`ROLLBACK`), preserving the database in its previous valid state.

3. **Checksum Drift Detection**:
   - When running against an existing database, the engine compares the SHA-256 hash of the local `.sql` file with the recorded checksum in `schema_migrations`.
   - Any manual modifications to already applied migrations are flagged immediately as potential schema drift.

---

## 4. Rollback Strategies

### Category A: Additive Schema Changes (Non-Destructive)
- **Examples**: Adding a new column with `DEFAULT` or `NULL`, creating a new index, adding a new table.
- **Rollback Procedure**:
  ```sql
  -- Rollback for ADD COLUMN
  ALTER TABLE referrals DROP COLUMN IF EXISTS new_column;
  
  -- Rollback for CREATE INDEX
  DROP INDEX IF EXISTS idx_name;
  
  -- Remove tracking record
  DELETE FROM schema_migrations WHERE version = '032';
  ```

### Category B: Constraint & Index Hardening
- **Examples**: Adding check constraints, unique partial indexes.
- **Rollback Procedure**:
  ```sql
  ALTER TABLE referrals DROP CONSTRAINT IF EXISTS chk_constraint_name;
  DROP INDEX IF EXISTS uq_index_name;
  DELETE FROM schema_migrations WHERE version = '032';
  ```

### Category C: Irreversible Migrations (Destructive / Data Transitions)
- **Policy**: In production healthcare systems, permanent drops of clinical data or tables are **strictly prohibited**.
- **Soft Deletion & Deprecation Phase**:
  1. Deprecate columns in application layer.
  2. Stop reading/writing in services.
  3. Mark columns as nullable.
  4. Perform logical archival before any eventual DDL drops.

---

## 5. CLI Execution Modes

| Command | Purpose |
|---|---|
| `node database/migrate.js` | Runs all pending migrations transactionally with checksums |
| `node database/migrate.js --status` | Lists all migrations and their status (`APPLIED` vs `PENDING`) |
| `node database/migrate.js --dry-run` | Previews pending migrations without executing them |
| `node database/migrate.js --validate` | Checks sequence numbering and file syntax without database connection |
