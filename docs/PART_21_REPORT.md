# CARECONNECT ETHIOPIA — IMPLEMENTATION REPORT
## PART 21 OF 50: HOSPITAL PORTAL DASHBOARD, NAVIGATION, REFERRAL INBOX AND INCOMING REFERRAL MANAGEMENT

**Date:** 2026-11-08  
**Portal:** Hospital Portal (`portals/hospital`, Port 5174)  
**Scope:** Commits 161–168 (8 Git Commits)  
**Status:** Completed & Verified  

---

### 1. ARCHITECTURE & WORKSPACE OVERVIEW

Part 21 establishes the foundational architecture and initial triage operational workflows for the **Hospital Portal** of CareConnect Ethiopia. Operating as one of four independent portals in the decentralized platform, the Hospital Portal provides receiving tertiary, specialized, and general hospital triage specialists, emergency physicians, and admissions officers with authoritative access to incoming electronic referrals originating from regional health centres.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                 Hospital Portal (Vite)                  │
                    │                        Port 5174                        │
                    └────────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │         HospitalLayout (Authorized Hospital Context)    │
                    │  - Server-Authoritative Session (useAuth)               │
                    │  - Dynamic Hospital Facility Profile & Badges           │
                    │  - Protected RBAC Navigation & Centralized Sign-Out     │
                    └────────────────────────────┬────────────────────────────┘
                                                 │
         ┌───────────────────────────────┬───────┴───────────────────────┬───────────────────────────────┐
         │                               │                               │                               │
         ▼                               ▼                               ▼                               ▼
┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
│   DashboardPage   │           │IncomingReferrals- │           │PendingReferrals-  │           │ReferralDetailPage │
│      (/ & /dash)  │           │   Page (/incoming)│           │   Page (/pending) │           │   (/referrals/:id)│
├───────────────────┤           ├───────────────────┤           ├───────────────────┤           ├───────────────────┤
│- Triage Metrics   │           │- Search & Debounce│           │- Action Work Queue│           │- Patient Demograph│
│  Cards            │           │- Status/Urgency   │           │- Intake & Triage  │           │- Clinical Summary │
│- Critical Alerts  │           │  Filters          │           │  Tabs             │           │- Structured Vitals│
│- Recent Transfers │           │- Dual Table/Cards │           │- Operational SLAs │           │- Diagnostic Files │
│- Quick Triage Nav │           │- Server Pagination│           │  vs Triage Rules  │           │- Audit Timeline   │
└───────────────────┘           └───────────────────┘           └───────────────────┘           └───────────────────┘
         │                               │                               │                               │
         └───────────────────────────────┼───────────────────────────────┴───────────────────────────────┘
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │      useHospitalRealtime Hook & Telemetry Gateway       │
                    │  - Missed-Events Recovery (/realtime/missed-events)     │
                    │  - Event Deduplication via ID Tracking Set              │
                    │  - Resilient 30s Polling Fallback                       │
                    │  - Zero PII in Logging & Ephemeral Memory Cache         │
                    └─────────────────────────────────────────────────────────┘
```

---

### 2. ROUTE HIERARCHY & PROTECTION

The Hospital Portal routing is defined in `portals/hospital/src/App.jsx` under authenticated, role-restricted guards:

| Route Path | Component | Guard / Access Policy | Purpose |
|---|---|---|---|
| `/login` | `LoginPage` | Public | Centralized authentication for hospital staff. |
| `/unauthorized` | `UnauthorizedPage` | Public | Access denied fallback for unauthorized roles. |
| `/` | `DashboardPage` | `ProtectedRoute` + `RoleRoute(PORTALS.HOSPITAL.allowedRoles)` | Master hospital triage and operational dashboard. |
| `/dashboard` | Navigate -> `/` | Protected | Legacy / navigational alias redirecting to root dashboard. |
| `/incoming` | `IncomingReferralsPage` | `ProtectedRoute` + `RoleRoute(...)` | Incoming referrals triage inbox with search, filter, and pagination. |
| `/referrals` | Navigate -> `/incoming` | Protected | Shortcut alias ensuring backward compatibility. |
| `/referrals/:referralId` | `ReferralDetailPage` | `ProtectedRoute` + `RoleRoute(...)` | In-depth referral detail, clinical vitals, attached files, and audit timeline. |
| `/incoming/:referralId` | `ReferralDetailPage` | `ProtectedRoute` + `RoleRoute(...)` | Direct deep-link alias to referral detail view. |
| `/pending` | `PendingReferralsPage` | `ProtectedRoute` + `RoleRoute(...)` | Actionable work queue for pending intake, triage, and clarification responses. |
| `/accepted` | `AcceptedReferralsPage` | `ProtectedRoute` + `RoleRoute(...)` | Directory of accepted referrals and allocated beds. |
| `/rejected` | `RejectedReferralsPage` | `ProtectedRoute` + `RoleRoute(...)` | Directory of rejected referrals with reasons and alternate suggestions. |
| `/arrivals` | `PatientArrivalsPage` | `ProtectedRoute` + `RoleRoute(...)` | Inpatient admission and physical patient arrival confirmation. |
| `/services` | `FacilityServicesPage` | `ProtectedRoute` + `RoleRoute(...)` | Hospital clinical departments and specialty services catalog. |
| `/capacity` | `CapacityManagementPage` | `ProtectedRoute` + `RoleRoute(...)` | Inpatient acute and ICU bed capacity tracking. |
| `/feedback` | `FeedbackPage` | `ProtectedRoute` + `RoleRoute(...)` | Clinical feedback and counter-referral communication. |
| `/reports` | `ReportsPage` | `ProtectedRoute` + `RoleRoute(...)` | Referral volume, triage timeliness, and acceptance reports. |
| `/settings` | `SettingsPage` | `ProtectedRoute` + `RoleRoute(...)` | Hospital profile, staff credentials, and notification settings. |
| `*` | `NotFoundPage` | Public / Protected | Catch-all 404 handler customized for Hospital Portal. |

All views leverage dynamic `React.lazy()` imports wrapped inside `<Suspense fallback={<RouteLoadingFallback />}>` for efficient code-splitting.

---

### 3. COMPONENT ARCHITECTURE & IMPLEMENTATION

The hospital frontend subsystem is modularized into specialized components:

1. **`hospitalService.js`**:
   - Centralized API gateway connecting the portal to backend versioned endpoints (`/api/v1/referrals/incoming`, `/api/v1/facilities/:id`, etc.).
   - Pure function `calculateHospitalOperationalMetrics()` computing real-time counts, active pipeline cases, and acceptance rates without hardcoded values.
   - Enforces facility tenancy isolation by transmitting the session context.
2. **`HospitalStatusBadge.jsx`**:
   - Visual badge supporting all referral lifecycle states: `DRAFT`, `SUBMITTED`, `ACKNOWLEDGED`, `IN_REVIEW`, `ACCEPTED`, `REJECTED`, `INFO_REQUESTED`, `IN_TRANSIT`, `ARRIVED`, `COMPLETED`, `CANCELLED`.
3. **`HospitalPriorityBadge.jsx`**:
   - Clinical urgency indicator (`ROUTINE`, `URGENT`, `EMERGENCY`) with Lucide icons and animated pulse styling for emergency life-threatening cases.
4. **`HospitalDashboardSkeleton.jsx` & `HospitalErrorState.jsx`**:
   - Accessible loading state providing skeleton rows and cards during network queries.
   - Resilient error handling state presenting clear diagnostics and a retry button (`onRetry`).
5. **`HospitalEmptyState.jsx`**:
   - Visual empty state with icon, title, description, and optional reset action.
6. **`HospitalLayout.jsx`**:
   - Dynamic wrapper integrating `useAuth()` to extract user details, clinician role label, and hospital facility context.
   - Dynamically queries `/api/v1/facilities/:id` and live metrics to populate sidebar badges.
7. **`DashboardPage.jsx`**:
   - Operational dashboard featuring 4 primary metric cards (New Incoming, In Triage Review, Accepted Cases, Info Requested), secondary telemetry bar (Total Incoming, Active Cases, Admitted, Acceptance Rate), critical emergency attention alert, recent incoming referrals table, and pending actions summary.
8. **`IncomingReferralsPage.jsx` & `HospitalReferralTable.jsx`**:
   - Comprehensive triage inbox featuring debounced search (by reference code, patient name, origin health centre), status filter, priority urgency filter, "Action Required" toggle, dual-mode table/card responsive layouts, and server-side pagination.
9. **`ReferralDetailPage.jsx`**:
   - Clinical referral detail view presenting patient demographics, primary diagnosis, detailed clinical narrative, structured physiological vitals table (Blood Pressure, Heart Rate, Respiratory Rate, Temperature, SpO2), transport requirements, attached diagnostic documents with preview links, inter-facility routing information, and chronological status timeline.
   - Strictly view-only for Part 21 (no independent decision execution).
10. **`PendingReferralsPage.jsx`**:
    - Hospital work queue categorized by operational status: `NEW_INCOMING` (awaiting intake), `PENDING_TRIAGE` (awaiting specialist review), `INFO_REQUESTED` (awaiting clinical clarifications).
    - Incorporates explicit architectural distinction between administrative response timeliness SLAs and clinician-determined triage priority.
11. **`useHospitalRealtime.js`**:
    - Telemetry hook recovering missed events via `/api/v1/realtime/missed-events`, deduplicating events with a persistent Set, and executing a resilient 30-second polling fallback.

---

### 4. BACKEND API INTEGRATION & SERVICE CONTRACTS

All data operations are centralized in `portals/hospital/src/services/hospitalService.js`:

| HTTP Method | API Endpoint | Service Method | Description |
|---|---|---|---|
| `GET` | `/api/v1/facilities/:id` | `getHospitalProfile(facilityId)` | Fetches receiving hospital facility profile, tier, and region. |
| `GET` | `/api/v1/referrals/incoming` | `getDashboardSummary()` | Queries incoming referrals and unread notifications to compute operational metrics. |
| `GET` | `/api/v1/referrals/incoming` | `getIncomingReferrals(params)` | Retrieves paginated incoming referrals with server filters (`page`, `limit`, `priority`, `status`, `search`). |
| `GET` | `/api/v1/referrals/:id` | `getReferralById(referralId)` | Fetches single referral details with clinical vitals and routing. |
| `GET` | `/api/v1/referrals/:id/timeline` | `getReferralTimeline(referralId)` | Retrieves chronological event timeline. |
| `GET` | `/api/v1/referrals/:id/history` | `getReferralHistory(referralId)` | Retrieves referral status transition records. |
| `GET` | `/api/v1/referrals/:id/documents` | `getReferralDocuments(referralId)` | Retrieves attached lab slips and imaging files. |
| `GET` | `/api/v1/referrals/:id/information-requests` | `getInformationRequests(referralId)` | Retrieves clinical clarification requests. |
| `GET` | `/api/v1/referrals/incoming` | `getPendingActions()` | Queries incoming queue for actionable statuses (`SUBMITTED`, `ACKNOWLEDGED`, `IN_REVIEW`, `INFO_REQUESTED`). |
| `GET` | `/api/v1/notifications` | `getNotifications(params)` | Retrieves hospital-specific notifications. |
| `GET` | `/api/v1/realtime/missed-events` | `getMissedEvents(params)` | Fetches missed real-time events since a given timestamp. |

---

### 5. OPERATIONAL SLA ESCALATION VS CLINICAL TRIAGE

A strict architectural principle is enforced across the Hospital Portal:
1. **Clinical Triage Urgency (`EMERGENCY`, `URGENT`, `ROUTINE`)**:
   - Set exclusively by healthcare clinicians based on medical severity and physiological observations.
   - Dictates resuscitation urgency and clinical handoff protocol.
2. **Operational Response SLAs**:
   - Administrative tracking of inter-facility communication responsiveness and hospital review deadlines under regional health authority protocols.
   - Evaluates whether hospital triage specialists review and acknowledge referrals within target timeframes (e.g., 15 minutes for emergency transfers).
   - Does **never** autonomously alter or override clinician-assigned triage priority.

---

### 6. SECURITY, PRIVACY & TENANCY SAFEGUARDS

1. **Facility Tenancy Enforcement**: Hospital users can only inspect referrals directed to their authorized hospital facility (`destinationFacilityId`).
2. **Zero Persistent Storage of Sensitive Clinical Data**: Patient names, national IDs, clinical diagnoses, and vital signs are kept volatile in React component memory. No sensitive referral data is stored in `localStorage` or `sessionStorage`.
3. **Zero Sensitive PII Console Logging**: Debugging statements and telemetry hooks strip or suppress patient names, national IDs, and clinical narratives to prevent log snooping.
4. **Role-Based Routing**: Strict `<RoleRoute>` guards ensure only authenticated users with authorized hospital roles (`HOSPITAL_TRIAGE_CLINICIAN`, `EMERGENCY_PHYSICIAN`, `CHIEF_CLINICAL_OFFICER`, `SYSTEM_ADMINISTRATOR`, `REGIONAL_OFFICER`) can access hospital workspaces.
5. **No Hardcoded Facility Identifiers**: Hospital identity is derived authoritatively from authenticated session tokens (`useAuth().user.facilityId`).

---

### 7. ACCESSIBILITY & USABILITY (WAI-ARIA)

- **Semantic Tables & Cards**: Incoming referrals queue features accessible HTML tables with descriptive header scopes (`<th scope="col">`) and mobile cards with clean hierarchical headings.
- **Dynamic Alerts**: Emergency triage banners and real-time connectivity status announce dynamically using `role="alert"` and `aria-live="assertive"` / `aria-live="polite"`.
- **Keyboard Navigation**: Interactive table rows, filter tabs, modal actions, and form inputs support standard keyboard navigation (`Tab`, `Enter`, `Space`) with `focus-visible:ring-2` highlights.
- **Responsive Layout**: Designed for seamless operation across desktop workstations, tablets used in triage wards, and smartphones.

---

### 8. VERIFICATION & TEST RESULTS

Automated test verification executed via Node.js native test runner:

```bash
npm run test:frontend
```

**Results:**
- Total Frontend Test Suites: **10 suites**
- Total Frontend Tests: **93 tests**
- Pass: **93 / 93 (100%)**
- Fail: **0**
- Duration: **3.49s**

**Part 21 Specific Suite (`shared/tests/hospitalPortalDashboard.test.js` — 10/10 Passed):**
- ✔ 1. Hospital Route Protection and RBAC Guards in App.jsx (3.7ms)
- ✔ 2. Hospital API Service Gateway Contracts (hospitalService.js) (1.1ms)
- ✔ 3. HospitalLayout Server-Authoritative Context & Navigation (2.6ms)
- ✔ 4. Hospital Dashboard Operational Metrics & Calculation (calculateHospitalOperationalMetrics) (0.8ms)
- ✔ 5. Incoming Referrals Inbox, Filtering, Search & Pagination (IncomingReferralsPage) (3.7ms)
- ✔ 6. Incoming Referral Detail View & Clinical Observations (ReferralDetailPage) (3.4ms)
- ✔ 7. Supporting Diagnostic Documents Handling & Attachment Display (2.1ms)
- ✔ 8. Hospital Pending Actions Workspace & Operational SLA Tracking (PendingReferralsPage) (3.0ms)
- ✔ 9. Real-Time Telemetry & Fallback Polling Hook (useHospitalRealtime) (2.0ms)
- ✔ 10. Security, Tenancy Isolation & Privacy Safeguards (2.1ms)

**Hospital Portal Production Build (`npm run build:hospital`):**
- Vite build completed in **38.54s** with **0 errors**.
- Generated assets: `IncomingReferralsPage-DdUGmmmt.js` (14.06 kB, gzip: 3.78 kB), `DashboardPage-DFGy1Yvf.js` (18.57 kB, gzip: 4.33 kB), `ReferralDetailPage-C9pZCrMv.js` (21.54 kB, gzip: 4.86 kB).

**Standards & Hygiene Check (`npm run check:standards`):**
- Scanned 198 JavaScript/JSX files with zero syntax or secret anomalies.
- All four independent portals validated with proper configurations.

---

### 9. COMMIT LOG (COMMITS 161–168)

| Commit # | Git Commit Hash | Commit Message | Key Changes |
|---|---|---|---|
| **161** | `f31a8d1` | `frontend: establish hospital portal architecture` | Established `hospitalService.js` client gateway, status & priority badges (`HospitalStatusBadge.jsx`, `HospitalPriorityBadge.jsx`), skeleton loader, error and empty states, and registered `/referrals/:referralId` and `/incoming/:referralId` routes in `App.jsx`. |
| **162** | `e629eb1` | `frontend: implement hospital dashboard interface` | Built `DashboardPage.jsx` with real backend metrics calculation, emergency triage alert banner, recent incoming referrals table, and pending work queue summary. |
| **163** | `e9daa67` | `frontend: implement hospital portal navigation and layout` | Built `HospitalLayout.jsx` with server-authoritative context from `useAuth()`, dynamic hospital profile integration, live unread notification badges, and centralized logout. |
| **164** | `15c5a04` | `frontend: implement hospital incoming referral inbox` | Built `IncomingReferralsPage.jsx` and `HospitalReferralTable.jsx` supporting debounced search, status and priority filters, "Action Required" toggle, server-side pagination, and dual table/card responsive layouts. |
| **165** | `e1fa728` | `frontend: implement hospital incoming referral detail interface` | Built `ReferralDetailPage.jsx` displaying patient demographics, clinical diagnosis narrative, structured physiological vitals table, attached diagnostic documents, and chronological audit timeline. |
| **166** | `4e75e8c` | `frontend: implement hospital referral pending actions workspace` | Built `PendingReferralsPage.jsx` supporting action category tabs (Awaiting Intake, In Triage Review, Info Requested), search, and explicit operational SLA guidance vs clinical triage criteria. |
| **167** | `63fbfc2` | `frontend: integrate hospital notifications and real-time dashboard updates` | Built `useHospitalRealtime.js` hook with missed-events recovery via `/api/v1/realtime/missed-events`, event deduplication, resilient 30-second polling fallback, and integrated live connectivity indicators. |
| **168** | `2ad25b4` | `test: verify hospital portal dashboard and incoming referral workflows` | Automated test suite in `shared/tests/hospitalPortalDashboard.test.js` (10/10 tests passing), verified standards, and authored `docs/PART_21_REPORT.md`. |
