# CareConnect Ethiopia — Database Migration & Rollback Guide

## 1. Migration Architecture & Transactional Protocol

Every schema evolution in CareConnect Ethiopia is encapsulated within a numbered SQL migration script (`database/migrations/NNN_<description>.sql`). The migration runner (`database/migrate.js`) enforces:

1. **Transactional Boundaries:** Every migration executes inside an atomic `BEGIN ... COMMIT` block. If any statement encounters an error, the transaction rolls back cleanly without partial schema alteration.
2. **Version Tracking:** Applied migrations are recorded in `schema_migrations(version, name, applied_at)`.
3. **Idempotency Standards:** DDL statements utilize `IF NOT EXISTS`, `OR REPLACE`, and conditional `DO $$ ... END $$;` PL/pgSQL blocks to allow safe re-runs.

---

## 2. Migration Execution Commands

```bash
# 1. Inspect Migration Status (Applied vs Pending)
npm run db:status

# 2. Execute Pending Forward Migrations
npm run db:migrate

# 3. Seed Fictional Development Records
npm run db:seed

# 4. Verify Database Integrity & Relationships
npm run test:db
```

---

## 3. Rollback & Disaster Recovery Strategy

### Forward Fix Policy
In enterprise PostgreSQL environments (especially cloud serverless systems like Neon), forward-fixing migrations via a corrective migration is preferred over raw destructive rollbacks (`DROP TABLE`) to avoid unintended data loss on live production replicas.

### Safe Rollback Procedure (Development & Staging)
When an experimental migration must be reverted in a development branch:
1. Identify the version identifier from `schema_migrations`:
   ```sql
   SELECT * FROM schema_migrations ORDER BY id DESC;
   ```
2. Execute the corresponding reverse DDL (dropping constraints and child tables before parent tables).
3. Delete the version record:
   ```sql
   DELETE FROM schema_migrations WHERE version = '019';
   ```
4. Re-run `npm run test:db` to verify relational consistency.

### Production Safeguards
- **Zero Raw Truncates/Drops:** Runtime scripts must never issue `DROP DATABASE`, `TRUNCATE`, or `DROP TABLE CASCADE`.
- **Soft Deletes:** Key business entities (`healthcare_facilities`, `users`, `patients`) utilize `deleted_at TIMESTAMP WITH TIME ZONE` instead of physical `DELETE` statements.
