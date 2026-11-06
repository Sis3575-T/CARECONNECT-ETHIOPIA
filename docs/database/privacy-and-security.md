# CareConnect Ethiopia — Database Privacy, Security & Row-Level Security Evaluation

## 1. Healthcare Data Protection Mandate

In compliance with Ethiopian healthcare confidentiality principles and international clinical data privacy standards, CareConnect Ethiopia enforces strict data minimization, cryptographic storage, and perimeter isolation:

1. **Separation of Concerns:** Patient demographics (`patients`), medical baseline history (`patient_medical_baseline`), authentication credentials (`users`), and access trails (`audit_logs`) are strictly segregated into distinct tables.
2. **Zero Plaintext Secrets:** Passwords are stored exclusively as 10+ round Bcrypt hashes. No API tokens or passwords appear in schema definitions or logs.
3. **Secure Document Storage:** Uploaded scans and PDF lab slips are represented via secure cloud object references (`storage_uri`) with SHA-256 integrity checksums. File payloads are never stored in raw PostgreSQL columns.
4. **Access Auditing:** Every inspection or download of patient documents is tracked in `document_access_logs`.

---

## 2. PostgreSQL Row-Level Security (RLS) Evaluation

### Current Status & Multi-Tenant Enforcement Layer
CareConnect Ethiopia currently enforces multi-tenant facility boundaries at the **Application & Middleware Tier** via:
- `backend/src/middleware/auth/facilityTenancy.js` (`requireFacilityTenancy`)
- Express Route Guards (`requireRole`, `requirePortal`)
- Parameterized SQL queries scoping records to the user's authenticated `facility_id`.

### Database Row-Level Security (RLS) Architecture Design
PostgreSQL native Row-Level Security provides defense-in-depth against accidental application-level leaks. However, in serverless environments utilizing connection poolers (such as Neon), activating RLS requires session variable injection before query execution.

#### Prepared RLS Policy Model
```sql
-- Example RLS Policy for Referrals Table (Prepared Architecture)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Health Centre Staff: Can only select referrals originating from their facility
CREATE POLICY referral_origin_tenancy_policy ON referrals
    FOR SELECT
    USING (
        origin_facility_id = current_setting('app.current_facility_id', true)
        OR destination_facility_id = current_setting('app.current_facility_id', true)
        OR current_setting('app.current_user_role', true) IN ('SYSTEM_ADMINISTRATOR', 'REGIONAL_OFFICER')
    );
```

### Prerequisites for Database-Level RLS Activation
To safely activate database-level RLS policies without breaking connection pool reuse:
1. **Session Context Middleware:** The Node.js Express backend must inject transaction-local configuration parameters (`SET LOCAL app.current_user_id = $1; SET LOCAL app.current_facility_id = $2;`) at the beginning of each pooled transaction.
2. **Scheduled Roadmap Phase:** This database-level session binding is scheduled for implementation in Phase 5 / Phase 6 when full multi-tenant session management is integrated into the API database service layer.
3. **Documented Enforcement State:** Database administrators must recognize that database-level RLS is currently in **Prepared & Evaluated** status; active tenancy enforcement is reliably handled by the API middleware layer.
