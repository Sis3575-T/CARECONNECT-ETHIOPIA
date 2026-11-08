# CARECONNECT ETHIOPIA — IMPLEMENTATION REPORT
## PART 20 OF 50: HEALTH CENTRE REFERRAL TRACKING, STATUS TIMELINE, HOSPITAL RESPONSES AND FOLLOW-UP WORKSPACE

**Date:** 2026-11-08  
**Portal:** Health Centre Portal (`portals/health-centre`)  
**Scope:** Commits 153–160 (8 Git Commits)  
**Status:** Completed & Verified  

---

### 1. ARCHITECTURE & WORKSPACE OVERVIEW

Part 20 delivers the comprehensive **Referral Tracking and Follow-Up Workspace** for the **Health Centre Portal** of CareConnect Ethiopia. After submitting digital referrals in Part 19, primary healthcare clinicians, health officers, and referral focal persons require continuous situational awareness over outgoing referrals, transparent hospital triage decisions, timely clarification request responses, inter-facility communication logging, and operational SLA escalation monitoring.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │               Health Centre Portal (Vite)               │
                    │                        Port 5173                        │
                    └────────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │       AllReferralsPage (/referrals & /tracking)         │
                    │  - Filter Bar: Status, Urgency, Search, Action Required │
                    │  - CSV Export & Pagination Controls                     │
                    └────────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │       ReferralTrackingTable (Desktop Table & Cards)     │
                    │  - Status & Urgency Badges                              │
                    │  - Destination Hospital & Clinical Department           │
                    │  - Patient Demographics & Direct Link to Patient Record │
                    │  - View Details / Track Progression Action              │
                    └────────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │          ReferralDetailPage (/referrals/:referralId)    │
                    │  - Live Real-time Status Synchronization                │
                    │  - Patient Demographics & Physiological Vitals Summary  │
                    │  - Clinical Diagnosis, History & Transport Requirements │
                    └───────┬─────────────────┬───────────────────┬───────────┘
                            │                 │                   │
                            ▼                 ▼                   ▼
    ┌───────────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────┐
    │ HospitalResponseCard      │ │ ReferralStatusTimeline│ │ ReferralInfoRequestsSection│
    │ - ACCEPTED (Bed, Dept)    │ │ - Chronological Audit │ │ - Hospital Clarifications │
    │ - REJECTED (Reason, Alt)  │ │ - Transition Milestones│ │ - Clinician Response Notes│
    │ - INFO_REQUESTED (Alert)  │ │ - Actor & Facility    │ │ - Supplementary Documents │
    │ - ACKNOWLEDGED / SUBMITTED│ │ - Verifiable Records  │ │ - Duplicate Submit Guard  │
    └───────────────────────────┘ └───────────────────────┘ └───────────────────────────┘
                            │
                            ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ ReferralFollowUpSection                                     │
    │ - Multi-Channel Communication Log (Phone, SMS, Email, In-App)│
    │ - Outcome & Coordination Notes Recording                    │
    │ - Operational SLA Escalation & Delay Warning Indicators    │
    │   (Administrative response timeliness vs clinical triage)   │
    └─────────────────────────────────────────────────────────────┘
```

---

### 2. ROUTE HIERARCHY & PROTECTION

The referral tracking workspace is securely registered in `portals/health-centre/src/App.jsx` under authenticated, role-restricted guards:

| Route Path | Component | Guard / Access Policy | Purpose |
|---|---|---|---|
| `/referrals` | `AllReferralsPage` | `ProtectedRoute` + `RoleRoute(PORTALS.HEALTH_CENTRE.allowedRoles)` | Master tracking workspace listing all outgoing referrals from the health centre. |
| `/tracking` | `TrackingPage` | `ProtectedRoute` + `RoleRoute(...)` | Dedicated tracking overview and lookup alias. |
| `/referrals/:referralId` | `ReferralDetailPage` | `ProtectedRoute` + `RoleRoute(...)` | In-depth referral detail, timeline, hospital response, and coordination workspace. |
| `/tracking/:referralId` | `ReferralDetailPage` | `ProtectedRoute` + `RoleRoute(...)` | Direct deep-link alias to referral tracking detail view. |

All tracking views leverage `React.lazy()` dynamic code-splitting wrapped inside `<Suspense fallback={<RouteLoadingFallback />}>` ensuring optimized production bundle loading.

---

### 3. COMPONENT ARCHITECTURE & WORKSPACE IMPLEMENTATION

The referral tracking subsystem is architected into modular, reusable components under `portals/health-centre/src/components/referrals/` and `src/pages/`:

1. **`ReferralStatusBadge.jsx`**:
   - Standardized visual badge supporting all referral lifecycle states: `DRAFT`, `SUBMITTED`, `ACKNOWLEDGED`, `IN_REVIEW`, `ACCEPTED`, `REJECTED`, `INFO_REQUESTED`, `TRANSFERRED`, `ARRIVED`, `COMPLETED`, `CANCELLED`.
   - Accessible color styling matching design system tokens with subtle border and text contrasts.

2. **`ReferralPriorityBadge.jsx`**:
   - Clinical urgency indicator displaying `ROUTINE`, `URGENT`, and `EMERGENCY` tiers with distinct iconography, color coding, and pulsating animations for emergency cases.

3. **`ReferralTrackingSkeleton.jsx` & `ReferralTrackingErrorState.jsx`**:
   - Accessible loading state providing skeleton rows and cards during network queries.
   - Resilient error handling state presenting clear diagnostics and a retry button (`onRetry`).

4. **`ReferralTrackingTable.jsx`**:
   - Dual-mode responsive presentation: tabular data layout on desktop displays and structured card layout on mobile and tablet screens.
   - Displays patient name, reference number, triage urgency, destination hospital, service specialty, submission timestamp, and current lifecycle status.
   - Direct navigation links to `/patients/:id` and `/referrals/:id`.

5. **`AllReferralsPage.jsx`**:
   - Master referral management workspace featuring debounced text search (reference code, patient name, diagnosis, hospital).
   - Filter controls: Status selector, Urgency selector, and "Action Required" toggle (highlighting `INFO_REQUESTED` and `REJECTED` cases).
   - Server-side pagination with record count display and CSV export functionality (`handleExportCSV`).

6. **`ReferralDetailPage.jsx`**:
   - Full referral overview presenting patient demographic details, contact numbers, biological sex, age, and Kebele/Woreda.
   - Clinical diagnosis, detailed clinical narrative, and structured physiological vitals table (Blood Pressure, Heart Rate, Respiratory Rate, Temperature, SpO2).
   - Emergency transport requirements, transit notes, and assigned destination hospital with department.
   - Embedded real-time connectivity status indicator with manual refresh action.

7. **`ReferralStatusTimeline.jsx`**:
   - Chronological audit trail consolidating status changes, decisions, info requests, and follow-ups.
   - Clear icon markers, timestamps formatted with `formatClinicalDate` and `formatRelativeTime`, and actor details.
   - Strictly renders actual backend audit records; zero simulated or random events.

8. **`HospitalResponseCard.jsx`**:
   - Prominently showcases receiving hospital triage responses.
   - **`ACCEPTED`**: Displays green confirmation banner, admitting department, contact specialist, bed allocation details, and admission instructions.
   - **`REJECTED`**: Displays high-visibility amber/red banner, transparent rejection rationale from hospital specialists, and a 1-click action to initiate an alternative referral.
   - **`INFO_REQUESTED`**: Displays urgent callout badge requesting additional clinical information.
   - **`ACKNOWLEDGED` / `SUBMITTED`**: Displays current triage review progress and expected turnaround times.

9. **`ReferralInfoRequestsSection.jsx`**:
   - Surfaces hospital requests for supplementary clinical details or diagnostic tests.
   - Pending state presents an expandable response form with validation requiring at least 5 characters.
   - Optional file attachment support for uploading supplementary lab results or images.
   - Atomic submission locking to prevent duplicate responses.

10. **`ReferralFollowUpSection.jsx`**:
    - Dedicated inter-facility communication logger supporting multiple channels: `PHONE_CALL`, `SMS`, `EMAIL`, `IN_PLATFORM`, and `MANUAL`.
    - Logs contact person, contact outcome, and operational notes.
    - Displays active operational SLA escalations and delay warnings, clearly clarifying administrative timeliness criteria versus clinical triage priorities.

11. **`useReferralRealtimeTracking.js`**:
    - Resilient synchronization hook recovering missed events via `/api/v1/realtime/missed-events`.
    - Client-side event deduplication using a persistent Set of seen event IDs.
    - Automatic 30-second polling fallback ensuring data freshness even when WebSocket/SSE connectivity is interrupted.
    - Exposes `isLiveConnected`, `isRefreshing`, and `triggerSync()` controls.

---

### 4. BACKEND API INTEGRATION & SERVICE CONTRACTS

All data operations are centralized in `portals/health-centre/src/services/referralTrackingService.js`:

| HTTP Method | API Endpoint | Service Method | Description |
|---|---|---|---|
| `GET` | `/api/v1/referrals` | `getReferrals(params)` | Retrieves paginated referrals with filters (status, priority, search, page, limit). |
| `GET` | `/api/v1/referrals/:id` | `getReferralById(id)` | Fetches single referral by UUID or reference number. |
| `GET` | `/api/v1/referrals/:id/timeline` | `getReferralTimeline(id)` | Retrieves unified chronological event timeline. |
| `GET` | `/api/v1/referrals/:id/history` | `getReferralHistory(id)` | Retrieves status transition history records. |
| `GET` | `/api/v1/referrals/:id/status` | `getReferralStatus(id)` | Lightweight status polling check. |
| `GET` | `/api/v1/referrals/track/:ref` | `trackByReference(referenceNumber)` | Public or inter-facility tracking by reference code. |
| `GET` | `/api/v1/referrals/:id/information-requests` | `getInformationRequests(id)` | Lists all information requests from destination hospital. |
| `POST` | `/api/v1/referrals/:id/information-requests/:requestId/respond` | `respondToInformationRequest(id, reqId, data)` | Submits structured clinician response notes and attachments. |
| `GET` | `/api/v1/referrals/:id/follow-ups` | `getFollowUps(id)` | Retrieves communication follow-up log. |
| `POST` | `/api/v1/referrals/:id/follow-ups` | `recordFollowUp(id, data)` | Records a new inter-facility follow-up contact entry. |
| `GET` | `/api/v1/referrals/:id/escalations` | `getEscalations(id)` | Retrieves operational SLA escalation alerts. |
| `POST` | `/api/v1/referrals/:id/escalations` | `createEscalation(id, data)` | Records an administrative SLA delay escalation. |
| `GET` | `/api/v1/referrals/:id/delays` | `getDelays(id)` | Retrieves calculated response delay metrics. |
| `GET` | `/api/v1/realtime/missed-events` | `getMissedEvents(params)` | Fetches missed real-time updates since a given timestamp. |

---

### 5. HOSPITAL TRIAGE DECISION HANDLING

Hospital decisions directly govern clinical handoff and patient movement:

- **`ACCEPTED` Decisions**:
  - Highlights receiving hospital readiness, allocated bed/unit, and instructions.
  - Allows the health centre clinician to prepare the patient for physical transfer and notify the transport coordinator.
- **`REJECTED` Decisions**:
  - Triage rejections are rendered transparently without hiding or obfuscation.
  - Displays hospital specialist comments, lack of capacity/specialty explanations, and alternative facility recommendations.
  - Provides an immediate "Initiate Alternate Referral" button pre-populating patient data into the Part 19 referral wizard.
- **`INFO_REQUESTED` Decisions**:
  - Triggers visual callout badges in both the referral list and detail view.
  - Enables clinicians to upload additional diagnostics or clarify history directly without restarting the referral process.

---

### 6. OPERATIONAL SLA ESCALATION VS CLINICAL TRIAGE

A critical architectural distinction is maintained between:
1. **Clinical Triage Urgency (`EMERGENCY`, `URGENT`, `ROUTINE`)**:
   - Set exclusively by clinicians based on physiological severity, vital signs, and patient condition.
   - Dictates medical priority and immediate resuscitation needs.
2. **Operational SLA Escalations**:
   - Administrative tracking of inter-facility communication responsiveness and hospital review deadlines.
   - Evaluates whether receiving facilities respond within agreed-upon regional healthcare operational windows.
   - Does **never** autonomously override clinical triage priority or alter patient medical status.

---

### 7. SECURITY, PRIVACY & TENANCY SAFEGUARDS

1. **Facility Tenancy Enforcement**: Backend queries filter referrals authoritatively by the health centre's facility ID. Clinicians can only monitor referrals originated by or assigned to their health centre.
2. **Zero Persistent Storage of Referral Data**: No patient identifiers, diagnoses, vitals, or hospital response details are cached in `localStorage` or `sessionStorage`. All data resides purely in ephemeral React memory.
3. **Zero Sensitive PII Console Logging**: Debug logs and API responses strip or suppress patient names, national IDs, and clinical narratives to prevent log snooping.
4. **Role-Based Guarding**: Only authenticated users with authorized health centre roles (`HEALTH_CENTRE_ADMIN`, `HEALTH_CENTRE_STAFF`, `HEALTH_OFFICER`, `CLINICIAN`, `NURSE`) can access tracking interfaces.
5. **Double Submission Protection**: Form submissions for information responses and follow-up logging implement disabling locks while pending.

---

### 8. ACCESSIBILITY & USABILITY (WAI-ARIA)

- **Semantic Tables & Cards**: Referral list features accessible HTML tables with descriptive header scopes (`<th scope="col">`) and mobile cards with semantic structure.
- **Dynamic Alerts**: Status alerts and live connectivity messages leverage `role="alert"` and `aria-live="polite"`.
- **Keyboard Navigation**: Interactive table rows, filter tabs, modal actions, and form inputs support standard keyboard navigation (`Tab`, `Enter`, `Space`) with `focus-visible:ring-2` highlights.
- **Responsive Layout**: Designed for seamless operation across desktop workstations, tablets used in triage wards, and smartphones.

---

### 9. VERIFICATION & TEST RESULTS

Automated test verification executed via Node.js native test runner:

```bash
npm run test:frontend
```

**Results:**
- Total Frontend Test Suites: **8 suites**
- Total Frontend Tests: **82 tests**
- Pass: **82 / 82 (100%)**
- Fail: **0**
- Duration: **3.06s**

**Part 20 Specific Suite (`shared/tests/healthCentreReferralTracking.test.js`):**
- ✔ 1. Referral Tracking Route Structure & Security in App.jsx (5.2ms)
- ✔ 2. Referral Tracking Service Gateway Contracts (1.0ms)
- ✔ 3. Referral Tracking Workspace & Table UI (AllReferralsPage & ReferralTrackingTable) (6.4ms)
- ✔ 4. Referral Detail View & Clinical Observation Structure (ReferralDetailPage) (3.5ms)
- ✔ 5. Status Timeline & Verifiable Event Rendering (ReferralStatusTimeline) (3.1ms)
- ✔ 6. Hospital Response Visibility & Decision Presentation (HospitalResponseCard) (6.0ms)
- ✔ 7. Information Request & Response Workflow (ReferralInfoRequestsSection) (4.8ms)
- ✔ 8. Follow-up Interaction & Operational Escalation Workspace (ReferralFollowUpSection) (3.5ms)
- ✔ 9. Real-time Telemetry & Fallback Polling Hook (useReferralRealtimeTracking) (3.2ms)
- ✔ 10. Privacy, Security & Tenancy Isolation Verification (3.7ms)

**Health Centre Portal Production Build (`npm run build:health`):**
- Vite build completed in 33.89s with 0 errors.
- Bundle output: `ReferralDetailPage-BvOhEl_C.js` (42.16 kB, gzip: 9.64 kB), `AllReferralsPage-BCp5dzpC.js` (18.10 kB, gzip: 4.86 kB).

**Standards & Hygiene Check (`npm run check:standards`):**
- Scanned 197 JavaScript/JSX files with zero syntax or secret anomalies.
- All four independent portals validated with proper configurations.

---

### 10. COMMIT LOG (COMMITS 153–160)

| Commit # | Git Commit Hash | Commit Message | Key Changes |
|---|---|---|---|
| **153** | `059434b` | `frontend: establish health centre referral tracking architecture` | Referral tracking service gateway, status and priority badges, skeleton loader, error state, and routes. |
| **154** | `a23ea4e` | `frontend: implement health centre referral tracking workspace` | Desktop table & mobile card view, debounced search, status & urgency filters, CSV export. |
| **155** | `09efae2` | `frontend: implement referral detail and status timeline` | Patient demographics, diagnosis, physiological vitals table, chronological status timeline. |
| **156** | `ec6fdac` | `frontend: implement hospital response visibility and referral decisions` | Hospital decision card supporting ACCEPTED, REJECTED with transparent reasons, and alternate referral initiation. |
| **157** | `2064a91` | `frontend: implement referral information request and response workflow` | Supplementary info request review, 5-char validated clinician responses, file attachments, submission guard. |
| **158** | `cb7316b` | `frontend: implement referral follow-up and coordination workspace` | Multi-channel communication logger (phone, SMS, email, in-app), outcome recording, operational SLA escalations. |
| **159** | `ca3efb0` | `frontend: integrate referral tracking notifications and real-time updates` | Real-time hook with missed events recovery, event deduplication, 30s polling fallback, and sync trigger. |
| **160** | `13cf4b7` | `test: verify health centre referral tracking and follow-up workflows` | Automated test suite (10 tests), standards verification, development progress tracker, and Part 20 report. |
