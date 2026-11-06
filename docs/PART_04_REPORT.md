# CareConnect Ethiopia — Part 04 Development Report
**Part:** 04 of 50 — Authentication, Authorization and Secure Session Management  
**Date:** 2026-11-06  
**Lead Backend Architect & Security Engineer:** Antigravity AI  

---

## 1. Executive Summary

Part 04 implements a production-grade, centralized authentication and authorization subsystem for **CareConnect Ethiopia**. The system serves as the unified security authority for all four independent frontend portals:
1. **Health Centre Portal** (`http://localhost:5173`)
2. **Hospital Portal** (`http://localhost:5174`)
3. **Transport Coordinator Portal** (`http://localhost:5175`)
4. **System Administrator Portal** (`http://localhost:5176`)

All four portals authenticate against the single backend identity engine, completely eliminating duplicate user stores, fragmented sessions, or siloed credentials.

The authentication and authorization architecture adheres strictly to national healthcare privacy standards and modern defensive security best practices:
- **Stateless Short-Lived Access Tokens:** Standardized 15-minute JWTs signed with `HS256`, verifying cryptographic signature, expiration, issuer (`careconnect-backend`), and audience (`careconnect-portals`).
- **Stateful Cryptographic Refresh Sessions:** 64-byte CSPRNG random refresh tokens whose raw values are never stored in the database; only cryptographic SHA-256 digests are maintained in PostgreSQL `user_sessions`.
- **Automatic Token Rotation & Reuse Detection:** Every refresh operation invalidates the previous token and issues a new pair. If an adversary attempts to replay an expired or already-rotated token, the entire session family is automatically revoked.
- **Defensive Anti-Enumeration & Constant-Time Verification:** Login and account recovery endpoints return uniform error messages (`Invalid email or password credentials`) and execute dummy bcrypt hash comparisons when an email does not exist to eliminate timing attack vectors.
- **Account Lockout Protection:** Accounts are automatically locked for 15 minutes after 5 consecutive failed login attempts, emitting auditable system security events.
- **Multi-Tenancy & Granular RBAC:** Complete role-based access control with 32 granular permissions mapped across 7 system roles, combined with facility boundary enforcement preventing cross-facility data leakage.
- **Account Recovery:** Secure, single-use password reset tokens with SHA-256 persistence and global session invalidation upon credential modification.

All 8 commits for Part 04 were successfully executed, with all 131 automated backend tests and 12 database migration tests passing with zero failures.

---

## 2. All Eight Git Commits

| Commit # | Hash | Type & Message | Key Deliverables & Summary |
|---|---|---|---|
| **025** | `bde1cf1` | `security: establish authentication architecture and policies` | Established comprehensive security policies in [backend/docs/authentication-architecture.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/authentication-architecture.md), [backend/docs/session-policies.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/session-policies.md), [docs/frontend-auth-contract.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/frontend-auth-contract.md), system enums in [backend/src/constants/index.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/constants/index.js), and verified with [backend/tests/authPolicies.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/authPolicies.test.js). |
| **026** | `d1145f6` | `security: implement secure password management` | Hardened [backend/src/utils/password.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/utils/password.js) with bcrypt hashing (10 rounds), common dictionary blacklist, 72-byte ceiling check, CSPRNG reset token generation and SHA-256 hashing; authored [backend/docs/password-policy.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/password-policy.md) and verified with [backend/tests/password.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/password.test.js). |
| **027** | `98b81a3` | `security: implement login and access token issuance` | Implemented `SecurityAuditService` in [backend/src/services/securityAuditService.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/services/securityAuditService.js), extended [backend/src/models/userModel.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/models/userModel.js) with lockout counters and failure tracking; enhanced [backend/src/utils/token.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/utils/token.js) with `HS256`, issuer `careconnect-backend`, and audience `careconnect-portals`; updated `login` controller with dummy hash timing attack protection and HttpOnly cookies; verified with [backend/tests/loginSecurity.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/loginSecurity.test.js) & [backend/tests/login.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/login.test.js). |
| **028** | `bc5c233` | `security: implement refresh token rotation and session management` | Implemented PostgreSQL-backed [backend/src/models/sessionModel.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/models/sessionModel.js) and [backend/src/services/sessionService.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/services/sessionService.js) managing cryptographic SHA-256 token rotation, family reuse detection, session listing (`GET /api/v1/auth/sessions`), targeted revocation (`DELETE /api/v1/auth/sessions/:sessionId`), and global logout (`POST /api/v1/auth/logout-all`); verified with [backend/tests/sessionRotation.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/sessionRotation.test.js) & [backend/tests/refresh.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/refresh.test.js). |
| **029** | `d0c9475` | `security: implement authentication middleware and user context` | Rewrote [backend/src/middleware/auth.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/auth.js) with strict header/cookie extraction, signature and claim verification, live database account status checks (rejection of deleted, deactivated, or locked accounts), and context enrichment into `req.user`; verified with [backend/tests/authMiddleware.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/authMiddleware.test.js) & [backend/tests/token.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/token.test.js). |
| **030** | `634503c` | `security: implement role and permission authorization` | Enhanced [backend/src/middleware/rbac.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/middleware/rbac.js) with `requirePermission`, `requireRole`, `requirePortal`, and `DEFAULT_ROLE_PERMISSIONS`; added `GET /api/v1/auth/permissions`; verified RBAC and facility isolation with [backend/tests/authorization.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/authorization.test.js), [backend/tests/rbac.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/rbac.test.js), and [backend/tests/facilityTenancy.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/facilityTenancy.test.js). |
| **031** | `f74b921` | `security: implement account recovery and session security` | Created database migration [database/migrations/025_password_reset_and_session_family.sql](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/database/migrations/025_password_reset_and_session_family.sql) creating `password_reset_tokens` table and `family_id` column; created [backend/src/models/passwordResetModel.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/models/passwordResetModel.js); implemented `changePassword`, `forgotPassword`, `resetPassword` in [backend/src/controllers/authController.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/controllers/authController.js); mounted `/change-password`, `/forgot-password`, `/reset-password` in [backend/src/routes/v1/auth.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/routes/v1/auth.js); verified with [backend/tests/accountRecovery.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/accountRecovery.test.js) and [database/tests/relationship.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/database/tests/relationship.test.js). |
| **032** | `d7c6565` | `test: verify authentication authorization and session security` | Authored comprehensive test suite [backend/tests/part04SecurityComprehensive.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/part04SecurityComprehensive.test.js) validating all 12 core security invariants; executed full backend test suite (131/131 passed), database test suite (12/12 passed), code quality check, updated [docs/DEVELOPMENT_PROGRESS.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/DEVELOPMENT_PROGRESS.md), and compiled this report. |

---

## 3. Architecture & Technical Decisions

### 3.1 Authentication Mechanism: Hybrid JWT Access + Hashed Refresh Sessions
- **Why Stateless Access Tokens (15 Minutes):**
  Reduces database query load for every high-frequency operational API request (vital signs recording, referral status polling, transport coordinates pinging) while maintaining a strict 15-minute exposure window if a client token is ever compromised.
- **Why Persistent Refresh Tokens (7 Days):**
  Healthcare workers operating during 12-hour hospital shifts or rural health centre clinics cannot be continually prompted for username/password credentials. Refresh tokens allow seamless background token renewal.
- **Why SHA-256 Hashing of Refresh Tokens:**
  Raw refresh tokens are 64-byte CSPRNG random hex strings. Storing raw tokens in the database exposes the system to complete session hijacking if a database read replica or backup snapshot is accessed. Storing only the SHA-256 hash ensures that even full database exposure does not allow an adversary to forge or use refresh sessions.

### 3.2 Refresh Token Rotation & Family Reuse Detection
Every time `POST /api/v1/auth/refresh` is called:
1. The server hashes the submitted raw token and looks up the active session in `user_sessions`.
2. If the session exists and has already been revoked (`is_revoked = TRUE`), a replay attack is diagnosed.
3. The server immediately invalidates the entire session family (`family_id = session.family_id`), revoking all active sessions for that user on that device tree and logging a critical security event (`SECURITY_EVENTS.REFRESH_TOKEN_REUSED`).
4. If valid, the existing session is revoked and a new session with the same `family_id` and a newly generated 64-byte token is persisted atomically.

### 3.3 Authorization Architecture: RBAC & Facility Tenancy
Authorization is implemented as two orthogonal layers:
1. **Granular RBAC (`requirePermission`):**
   - 32 granular permissions (e.g. `referral:create`, `referral:accept`, `patient:write`, `transport:dispatch`, `audit:read`, `user:manage`).
   - Standard roles:
     - `HEALTH_CENTRE_STAFF` (Role 1): Referral initiation, local patient management.
     - `HOSPITAL_STAFF` / `HOSPITAL_TRIAGE` (Roles 2 & 3): Referral inbox review, acceptance/rejection, bed capacity management.
     - `TRANSPORT_COORDINATOR` / `AMBULANCE_DRIVER` (Roles 4 & 5): Transport dispatch, vehicle assignment, delay logging.
     - `SYSTEM_ADMINISTRATOR` (Role 6): Full system management, user provisioning, security audit inspection.
     - `REGIONAL_OFFICER` (Role 7): Regional analytics and healthcare referral oversight.
2. **Facility Tenancy Enforcement (`enforceFacilityAccess`):**
   - Clinical entities and incoming referrals belong strictly to specific healthcare facilities.
   - Non-administrative users attempting to inspect or modify records belonging to a different `facility_id` are halted immediately with `403 Forbidden` (`Facility tenancy violation`).

---

## 4. Verification & Automated Test Results

### 4.1 Section 11 — The 12 Security Invariants Verified

Automated test suite [backend/tests/part04SecurityComprehensive.test.js](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/tests/part04SecurityComprehensive.test.js) verifies all twelve mandatory security requirements:

| # | Security Invariant Requirement | Test Result | Verification Description |
|---|---|---|---|
| **1** | Anonymous requests cannot access protected endpoints | ✅ PASS | Protected routes (`/api/v1/auth/me`) reject unauthenticated requests with `401 UNAUTHORIZED`. |
| **2** | Invalid access tokens are rejected | ✅ PASS | Malformed tokens or tokens signed with incorrect secrets are rejected with `401 UNAUTHORIZED`. |
| **3** | Expired access tokens are rejected | ✅ PASS | Tokens past their expiration timestamp are rejected with `401 UNAUTHORIZED`. |
| **4** | Users cannot change their own role through client input | ✅ PASS | Self-registration or input attempting to assign Role 6 (System Administrator) is halted with `403 FORBIDDEN`. |
| **5** | Users cannot impersonate another user by changing an ID | ✅ PASS | User context is derived strictly from the cryptographic JWT `sub` claim; query parameters or client headers attempting identity override are ignored. |
| **6** | Health-centre users cannot access another facility's records | ✅ PASS | Accessing records with an unassigned facility ID triggers immediate `403 FORBIDDEN` tenancy rejection. |
| **7** | Hospital users cannot access unassigned foreign facility records | ✅ PASS | Hospital specialists attempting to inspect another hospital's inbox are rejected with `403 FORBIDDEN`. |
| **8** | Transport coordinators cannot access administrator functions | ✅ PASS | Transport roles attempting to query `/api/v1/admin/audit-logs` or manage users receive `403 FORBIDDEN`. |
| **9** | Suspended accounts cannot continue authenticated activity | ✅ PASS | Tokens presented by accounts marked `is_active = FALSE` in the database fail authentication with `401 UNAUTHORIZED`. |
| **10** | Revoked refresh tokens cannot be reused successfully | ✅ PASS | Replaying an already-rotated refresh token is rejected and invalidates the session family. |
| **11** | Password-reset tokens cannot be reused | ✅ PASS | Password reset tokens are marked `is_used = TRUE` upon first consumption; replay attempts return `400 VALIDATION_ERROR`. |
| **12** | Error messages do not reveal passwords, token contents, or account existence | ✅ PASS | Non-existent accounts and incorrect passwords yield identical `401` error payloads and timing profiles; password reset requests yield uniform success confirmations. |

### 4.2 Comprehensive Test Execution Totals

```text
============================================================
   CARECONNECT ETHIOPIA - TEST SUITE VERIFICATION
============================================================

[1/3] Database Migration & Schema Suite (npm run test:db):
  ✔ 12 tests across 2 suites passed (0 failures)

[2/3] Backend API, Auth & Security Suite (npm run test:backend):
  ✔ 131 tests across 1 suite passed (0 failures)

[3/3] Code Quality & Architecture Standards (npm run check:standards):
  ✔ 51 JavaScript files scanned with zero syntax/secret anomalies.
  ✔ 4 portal independence checks passed.
```

---

## 5. Summary of Deliverables

1. **Authentication Engine:** Complete login, logout, logout-all, refresh with rotation, session inspection, and session revocation.
2. **Authorization Engine:** Role and permission validation middleware, portal isolation, and facility multi-tenancy enforcement.
3. **Account Recovery Subsystem:** Password change, forgot password, and reset password with one-time hashed tokens and global session invalidation.
4. **Database Migration:** Migration `025_password_reset_and_session_family.sql` creating `password_reset_tokens` table and `family_id` column.
5. **Architectural Documentation:**
   - [backend/docs/authentication-architecture.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/authentication-architecture.md)
   - [backend/docs/session-policies.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/session-policies.md)
   - [backend/docs/password-policy.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/password-policy.md)
   - [docs/frontend-auth-contract.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/frontend-auth-contract.md)
   - [docs/PART_04_REPORT.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/PART_04_REPORT.md)
6. **Git History:** Exactly 8 meaningful commits executing Part 04 (Commits 025 to 032).
