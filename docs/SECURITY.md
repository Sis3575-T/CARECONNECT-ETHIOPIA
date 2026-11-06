# CareConnect Ethiopia — Security & Secret Management Policy

## 1. Security Architecture & Threat Model

CareConnect Ethiopia manages sensitive clinical referral information, patient medical records, national identification numbers (Fayda ID), and inter-facility healthcare telemetry. The platform enforces defense-in-depth across the entire request lifecycle.

```text
+-----------------------------------------------------------------------------------+
|                           Layered Security Controls                               |
+-----------------------------------------------------------------------------------+
| 1. Transport Layer     | TLS 1.3 / Strict HTTPS / Neon SSL Database Encryption    |
| 2. Perimeter Layer     | Helmet Security Headers / CORS Domain Whitelist          |
| 3. Authentication      | Dual JWT (Short-lived Access + Revocable Refresh Tokens) |
| 4. Authorization       | Role-Based Access Control (RBAC) + Facility Multi-Tenancy|
| 5. Secret Protection   | Zero Credential Check-in / Automated Git Pattern Guard   |
| 6. Audit & Governance  | Immutable Audit Logging with Distributed Trace IDs       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Zero-Secrets Policy & Credential Guard

- **Git Tracking Auditing:** No files containing credentials, passwords, or cloud tokens may ever be tracked in Git.
- **Git Ignore Guards:** All `.env*` files (except `.env.example`), `.pem`, `.key`, `.pfx`, `credentials.json`, and service account tokens are blacklisted via `.gitignore`.
- **Credential Masking in Logs:** The database connection module and request logging middleware actively mask passwords and sensitive headers before writing to console or file streams.
- **Client Sanitization:** Vite bundles are inspected to guarantee that no server-side secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `EXTERNAL_SERVICE_API_KEY`) are bundled into client JavaScript.

---

## 3. Cryptographic Token Architecture

1. **Access Tokens:**
   - Standard: Signed JWT (HS256 with 256-bit+ entropy).
   - Lifetime: 15 minutes.
   - Payload: Contains `sub` (User ID), `role`, `facility_id`, and `portal`.
   - Transmission: Sent via HTTP `Authorization: Bearer <token>` header.
2. **Refresh Tokens:**
   - Lifetime: 7 days.
   - Storage: Stored hashed in the database with revocation tracking.
   - Rotation: Single-use token rotation during renewal; prior token is immediately invalidated.
3. **Password Security:**
   - Algorithm: Bcrypt with work factor of 10+ rounds.
   - Complexity: Enforced minimum 8 characters with alphanumeric requirements.

---

## 4. Multi-Tenant Tenancy & Access Control

- **Facility Boundary Enforcement:** Users assigned to a specific health centre or hospital are restricted to records belonging to their facility (`backend/src/middleware/auth/facilityTenancy.js`).
- **Super-Admin Exceptions:** Only verified `System Administrator` and `Regional Health Bureau` roles possess cross-facility inspection authorization.
- **Fail-Safe Authorization:** Any route lacking valid credentials defaults to `401 Unauthorized`. Any attempt to access cross-facility data without authority defaults to `403 Forbidden`.

---

## 5. Security Incident Response

If a secret or credential is inadvertently exposed:
1. Immediately revoke the token or rotate the database password on Neon.
2. Purge the Git history using `git filter-repo` or BFG Repo-Cleaner if accidentally pushed.
3. Restart all affected services with the newly generated secrets.
4. Review audit logs for unauthorized access during the exposure window.
