# CareConnect Ethiopia — Implementation Report
## Part 07 of 50: Digital Referral Management and Referral Tracking

---

### Executive Summary

Part 07 delivers a comprehensive, production-grade **Digital Referral Management and Referral Tracking Domain** for CareConnect Ethiopia. It provides end-to-end digital coordination between primary health centres, general hospitals, tertiary referral centers, and transport dispatchers across Ethiopia.

The architecture enforces a strict finite state machine, non-guessable cryptographic reference numbers (`ETH-REF-YYYY-XXXXXX`), auditable clinical triage decisions, mandatory justification for clinical priority escalations and rejections, role-based privacy boundaries (redacting clinical details for transport coordinators), and public status tracking without exposing patient demographics or confidential clinical summaries.

All components are implemented in modern pure JavaScript (ES Modules, Node.js 24, Express 5, PostgreSQL / Neon) with dual-mode operational capability (live PostgreSQL queries with in-memory test store fallback).

---

### Clinical Architecture & Healthcare Realities

1. **Non-Guessable Human-Readable Reference Numbers**:
   - Format: `ETH-REF-YYYY-XXXXXX` (e.g. `ETH-REF-2026-A4F79C`).
   - Generated using cryptographically secure random bytes (`crypto.randomBytes`) preventing URL enumeration attacks by external actors while remaining easy to communicate over VHF radio, SMS, or telephone.
2. **Strict Finite State Machine & Lifecycle Governance**:
   - `DRAFT` ➔ `SUBMITTED`, `CANCELLED`
   - `SUBMITTED` ➔ `PENDING_ASSIGNMENT`, `ASSIGNED`, `ACKNOWLEDGED`, `ACCEPTED`, `REJECTED`, `INFO_REQUESTED`, `CANCELLED`
   - `PENDING_ASSIGNMENT` ➔ `ASSIGNED`, `CANCELLED`
   - `ASSIGNED` ➔ `ACKNOWLEDGED`, `ACCEPTED`, `REJECTED`, `INFO_REQUESTED`, `CANCELLED`
   - `ACKNOWLEDGED` ➔ `ACCEPTED`, `REJECTED`, `INFO_REQUESTED`, `CANCELLED`
   - `INFO_REQUESTED` ➔ `SUBMITTED`, `ACKNOWLEDGED`, `ACCEPTED`, `REJECTED`, `CANCELLED`
   - `ACCEPTED` ➔ `TRANSPORT_ASSIGNED`, `IN_TRANSIT`, `PATIENT_ARRIVED`, `CANCELLED`
   - `PATIENT_ARRIVED` / `ARRIVED` ➔ `IN_PROGRESS`, `COMPLETED`, `CLOSED`
   - `IN_PROGRESS` ➔ `COMPLETED`, `CLOSED`
   - `COMPLETED` ➔ `CLOSED`
   - **Terminal States**: `REJECTED`, `CANCELLED`, `CLOSED`. Any attempt to transition out of a terminal state is strictly rejected with HTTP 400 Bad Request.
3. **Hospital Clinical Decisions with Bed & Ward Allocation**:
   - Authorized clinicians at receiving facilities can acknowledge, accept, reject, or request diagnostic clarifications.
   - Acceptance records assigned ward department and bed type (`ICU`, `CARDIOLOGY_WARD`, `SURGICAL_WARD`, `EMERGENCY_BAY`).
   - Rejection requires a mandatory clinical justification reason (minimum 5 characters) and a standardized rejection code (`CAPACITY_FULL`, `CAPACITY_EXCEEDED`, `NO_BEDS_AVAILABLE`, `SPECIALIST_UNAVAILABLE`, `INAPPROPRIATE_CLINICAL_TIER`, `EQUIPMENT_MAINTENANCE`, `OTHER`).
   - Rejections and acceptance events are recorded immutably in `referral_decisions`.
4. **Tenancy Isolation across Health Centres & Hospitals**:
   - Referring health centres can only view and mutate referrals originating from their assigned facility.
   - Hospital clinicians can only view and make triage decisions on referrals assigned to their hospital; cross-hospital decisions are blocked with `403 Forbidden`.
   - Regional coordinators and system administrators retain cross-facility oversight.
5. **Transport Coordinator Role Privacy Scope**:
   - Transport coordinators (Role 4) and dispatchers access operational transit details (pickup origin, destination hospital, priority tier, transport required, emergency phone).
   - Clinical notes, primary diagnoses, clinical summaries, and vital signs are strictly redacted from transport responses to safeguard patient medical privacy.
   - Transport coordinators cannot assign receiving hospitals or alter clinical triage priorities (blocked with `403 Forbidden`).
6. **Public Reference Tracking (`/api/v1/referrals/track/:reference`)**:
   - Open publicly without credentials for patients, guardians, and ambulance drivers.
   - Returns operational milestones (`submitted_at`, `acknowledged_at`, `decision_at`, `arrived_at`, `completed_at`, `created_at`), status, priority, and facility names.
   - Zero confidential patient data is revealed: patient names, phone numbers, national IDs, diagnoses, and clinical notes are omitted.
7. **Immutable Audit Trails & Corrections**:
   - Clinical priority modifications require clinical justification and are tracked in `referral_corrections`.
   - Every referral event triggers structured logging in `system_events`.

---

### Database Schema Migration 028

Migration file: [`database/migrations/028_referral_tracking_and_corrections.sql`](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/database/migrations/028_referral_tracking_and_corrections.sql)

- Extended `referrals` table with:
  - `reference_number VARCHAR(100) UNIQUE`
  - `cancelled_at TIMESTAMP WITH TIME ZONE`
  - `cancelled_by_user_id INTEGER REFERENCES users(id)`
  - `cancellation_reason TEXT`
  - `closed_at TIMESTAMP WITH TIME ZONE`
  - `closed_by_user_id INTEGER REFERENCES users(id)`
  - `closure_reason TEXT`
  - `current_progress_notes TEXT`
  - Unique index `idx_referrals_reference_number`
- Created `referral_corrections` table:
  - `id SERIAL PRIMARY KEY`
  - `uuid UUID DEFAULT gen_random_uuid()`
  - `referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id)`
  - `field_name VARCHAR(100) NOT NULL`
  - `old_value TEXT`
  - `new_value TEXT NOT NULL`
  - `reason TEXT NOT NULL`
  - `corrected_by_user_id INTEGER REFERENCES users(id)`
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

---

### Part 07 Git Commit Log (Commits 049 through 056)

| Commit | Hash | Description |
|---|---|---|
| **049** | `1aa1b5a` | `backend: establish digital referral domain` |
| **050** | `ee2152f` | `backend: implement secure referral creation and submission` |
| **051** | `85288f9` | `backend: implement referral lifecycle and status history` |
| **052** | `6b0cfff` | `backend: implement hospital referral acknowledgement and decisions` |
| **053** | `cff0fbe` | `backend: implement referral assignment and priority management` |
| **054** | `68d2be4` | `backend: implement referral tracking and operational progress` |
| **055** | `6823ea3` | `security: implement referral correction cancellation and audit` |
| **056** | `PENDING` | `test: verify referral lifecycle and hospital coordination` |

---

### Verification and Test Suite Results

1. **Backend Test Suite (`npm run test:backend`)**:
   - **334 passed**, 0 failed, 0 skipped across 30 test files.
   - Comprehensive test coverage for referral creation, state machine transitions, hospital decisions, priority management, tracking, corrections, and security.
2. **Database Test Suite (`npm run test:db`)**:
   - **12 passed**, 0 failed across 28 migrations.
   - Validated table definitions, foreign keys, constraints, and audit tables.
3. **Standards & Code Quality (`npm run check:standards`)**:
   - Scanned **80 JavaScript files** across the repository with zero syntax or credential anomalies.
   - Validated independent Vite configurations for all 4 portals.

---

### Key Architectural Artifacts

- Referral Domain Controller: [`backend/src/controllers/referralController.js`](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/controllers/referralController.js)
- Referral Service Logic: [`backend/src/services/referralService.js`](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/services/referralService.js)
- Referral Repository: [`backend/src/repositories/referralRepository.js`](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/repositories/referralRepository.js)
- Referral Validator Engine: [`backend/src/validators/referralValidator.js`](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/validators/referralValidator.js)
- Referral REST Routes: [`backend/src/routes/v1/referrals.js`](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/src/routes/v1/referrals.js)
- Architecture Documentation: [`backend/docs/referral-architecture.md`](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/backend/docs/referral-architecture.md)
