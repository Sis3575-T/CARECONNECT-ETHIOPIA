# CARECONNECT ETHIOPIA — IMPLEMENTATION REPORT
## PART 19 OF 50: HEALTH CENTRE DIGITAL REFERRAL CREATION, CLINICAL INFORMATION CAPTURE, HOSPITAL SELECTION AND SECURE REFERRAL SUBMISSION

**Date:** 2026-11-08  
**Portal:** Health Centre Portal (`portals/health-centre`)  
**Scope:** Commits 145–152 (8 Git Commits)  
**Status:** Completed & Verified  

---

### 1. ARCHITECTURE & WORKSPACE OVERVIEW

Part 19 delivers the end-to-end digital referral creation and submission subsystem of the **Health Centre Portal** for CareConnect Ethiopia. It equips primary healthcare clinicians and health officers with a guided 5-step wizard to initiate, document, select receiving destinations, attach diagnostic files, review compliance, and transmit structured electronic referrals to tertiary and specialized hospitals.

```
                    ┌───────────────────────────────────────────────┐
                    │          Health Centre Portal (Vite)          │
                    │               Port 5173                       │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │    CreateReferralPage (/referrals/new)        │
                    │        Multi-Step Referral Wizard             │
                    └───────────────────────┬───────────────────────┘
                                            │
        ┌───────────────┬───────────────────┼───────────────────┬───────────────┐
        │               │                   │                   │               │
        ▼               ▼                   ▼                   ▼               ▼
┌──────────────┐ ┌──────────────┐   ┌──────────────┐    ┌──────────────┐ ┌──────────────┐
│   Step 1     │ │    Step 2    │   │    Step 3    │    │    Step 4    │ │    Step 5    │
│ Patient      │ │ Clinical Info│   │ Destination  │    │ Supporting   │ │ Review &     │
│ Selection    │ │ & Vitals     │   │ & Specialty  │    │ Documents    │ │ Submit       │
│ - Search Dir │ │ - Priority   │   │ - Directory  │    │ - File Upload│ │ - Verification│
│ - Demographic│ │ - Diagnosis  │   │ - Regions    │    │ - Max 10MB   │ │ - Guidelines │
│ - Fast Select│ │ - Vitals Bnd │   │ - Services   │    │ - PDF/PNG/JPG│ │ - POST /api  │
└──────────────┘ └──────────────┘   └──────────────┘    └──────────────┘ └──────┬───────┘
                                                                                │
                                                                                ▼
                                                                ┌───────────────────────────────┐
                                                                │  ReferralConfirmationStep     │
                                                                │  - Official ETH-REF Reference │
                                                                │  - Copy Reference to Clipboard│
                                                                │  - Print Clinical Transfer    │
                                                                │  - Real-time Queue Tracking   │
                                                                └───────────────────────────────┘
```

---

### 2. ROUTE HIERARCHY & PROTECTION

The digital referral creation interface is mounted in `portals/health-centre/src/App.jsx` under authenticated, role-restricted guards:

| Route Path | Component | Guard / Access Policy | Purpose |
|---|---|---|---|
| `/referrals/new` | `CreateReferralPage` | `ProtectedRoute` + `RoleRoute(PORTALS.HEALTH_CENTRE.allowedRoles)` | Primary entry point for multi-step digital clinical referral wizard. |
| `/create-referral` | `CreateReferralPage` | `ProtectedRoute` + `RoleRoute(...)` | Legacy / navigational shortcut alias ensuring deep-link backward compatibility. |

All referral creation views leverage `React.lazy()` dynamic imports wrapped inside `<Suspense fallback={<RouteLoadingFallback />}>` for optimal bundle efficiency.

---

### 3. COMPONENT HIERARCHY & MODULAR STEP STRUCTURE

The workflow is architected into focused, decoupled step components under `portals/health-centre/src/components/referrals/`:

1. **`ReferralStepIndicator.jsx`**:
   - 5-step responsive horizontal tracker with progress markers, Lucide icons, and `aria-current="step"`.
   - Accessible keyboard clickability for completed and active stages.
2. **`ReferralPatientStep.jsx` (Step 1)**:
   - Debounced search querying `/api/v1/patients` under the clinician's health facility context.
   - Pre-selection support via `?patientId=` query parameter for direct handoff from Patient Management.
   - Demographic summary card (Name, Age, Biological Sex, Phone, Kebele/Woreda, Fayda ID).
   - "Patient Not Registered? Add New" link redirecting directly to `/patients/register`.
3. **`ReferralClinicalStep.jsx` (Step 2)**:
   - Clinical urgency tier selector: `ROUTINE` (standard clinic review), `URGENT` (within 24 hours), `EMERGENCY` (immediate life-threatening resuscitation/transfer).
   - Primary clinical diagnosis and reason for referral text fields.
   - Detailed clinical history and examination text area (minimum 5 characters).
   - Structured vital signs inputs validating physiological bounds:
     - Blood Pressure (systolic/diastolic format: `###/## mmHg`)
     - Pulse / Heart Rate (`20` to `250` bpm)
     - Respiratory Rate (`4` to `80` breaths/min)
     - Body Temperature (`25.0` to `45.0` °C)
     - Oxygen Saturation / SpO2 (`40` to `100` %)
   - Provisional treatment and emergency medication documentation.
   - Ambulance / emergency transport requirement toggle and logistical transit notes.
4. **`ReferralDestinationStep.jsx` (Step 3)**:
   - Destination hospital directory search and regional dropdown (covering all 12 Ethiopian regions and 2 chartered cities).
   - Hospital cards detailing facility type, administrative woreda, and geographic region.
   - Target clinical department / specialty selector mapped dynamically via `/api/v1/facilities/:id/services` with curated fallbacks.
5. **`ReferralDocumentsStep.jsx` (Step 4)**:
   - Drag-and-drop or file browser uploader with category selection (`LAB_RESULT`, `IMAGING`, `CLINICAL_NOTE`, `PRESCRIPTION`, `DISCHARGE_SUMMARY`, `OTHER`).
   - Strict client-side validation enforcing 10MB maximum file size and MIME filtering (`application/pdf`, `image/jpeg`, `image/png`).
   - Attached files list with formatted byte sizes, document types, custom notes, and accessible remove actions.
6. **`ReferralReviewStep.jsx` (Step 5)**:
   - Consolidated summary of all clinical, patient, destination, and attachment data prior to transmission.
   - Prominent Emergency Urgency banner for life-threatening cases with pulsed indicators.
   - Independent "Edit Section" jump buttons returning to any prior step without data loss.
   - Federal Ministry of Health Clinical Referral Guideline compliance certification statement.
7. **`ReferralConfirmationStep.jsx` (Outcome)**:
   - Official generated Ethiopian referral reference code display (e.g., `ETH-REF-2026-XXXXXX`).
   - One-click copy to clipboard with 2-second visual feedback.
   - Browser print action (`window.print()`) for physical paper referral slips during transit.
   - Direct navigation to Referrals Workspace (`/referrals`) and "Create Another Referral" reset action.

---

### 4. BACKEND API INTEGRATION & SERVICE CONTRACTS

The frontend interacts with backend endpoints via `referralCreationService.js`:

| HTTP Method | API Endpoint | Service Method | Description |
|---|---|---|---|
| `POST` | `/api/v1/referrals` | `referralCreationService.createReferral(payload)` | Creates new referral record with status `SUBMITTED`. |
| `GET` | `/api/v1/referrals/:id` | `referralCreationService.getReferralById(id)` | Fetches single referral by primary key or reference code. |
| `PATCH` | `/api/v1/referrals/:id` | `referralCreationService.updateReferral(id, data)` | Updates referral draft or clinical details. |
| `POST` | `/api/v1/referrals/:id/submit` | `referralCreationService.submitReferral(id)` | Submits draft referral for hospital triage. |
| `GET` | `/api/v1/facilities` | `referralCreationService.getDestinationHospitals(params)` | Retrieves active receiving hospitals filtered by region and search. |
| `GET` | `/api/v1/facilities/:id/services` | `referralCreationService.getHospitalServices(id)` | Retrieves clinical specialty services for a specific destination hospital. |
| `POST` | `/api/v1/referrals/:id/documents` | `referralCreationService.uploadReferralDocument(id, file, meta)` | Uploads multipart supporting diagnostic files. |
| `GET` | `/api/v1/referrals/:id/documents` | `referralCreationService.getReferralDocuments(id)` | Retrieves attached files associated with a referral. |

---

### 5. VITALS RANGE RULES & CLINICAL VALIDATION

Vital observation fields implement strict boundary validations aligning with backend `referralValidator.js` and clinical physiological reality:

| Vital Sign | Permitted Range | Unit | Error Notification |
|---|---|---|---|
| Pulse Rate | 20 – 250 | bpm | "Pulse rate must be between 20 and 250 bpm" |
| Respiratory Rate | 4 – 80 | breaths/min | "Respiratory rate must be between 4 and 80 breaths/min" |
| Temperature | 25.0 – 45.0 | °C | "Body temperature must be between 25.0 and 45.0 °C" |
| SpO2 | 40 – 100 | % | "SpO2 oxygen saturation must be between 40 and 100%" |
| Blood Pressure | Optional / Format: `###/##` | mmHg | Validated string format |

---

### 6. SECURITY, PRIVACY & TENANCY SAFEGUARDS

1. **Facility Tenancy Enforcement**: The referring facility context is derived authoritatively from the authenticated user session (`useAuth().user.facilityId`), eliminating client-side tenant spoofing or unauthorized cross-facility referrals.
2. **Zero Persistent Storage of Referral Data**: Form state and clinical observations are held exclusively in volatile React component memory. No patient PII, diagnoses, or vitals are stored in `localStorage` or `sessionStorage`.
3. **Zero PII Console Logging**: Debug statements and error handlers omit patient demographic data (names, national ID, phone numbers, clinical narratives) from browser console logs.
4. **Duplicate Submission Locking**: Atomic `isSubmitting` state disables submission triggers and renders a loading spinner, preventing accidental double submissions during high-latency connections.
5. **Role-Based Routing**: Strict `RoleRoute` protection ensures only healthcare workers assigned to health centre portals can access the referral initiation workflow.

---

### 7. ACCESSIBILITY & USABILITY (WAI-ARIA)

- **Navigation Semantics**: Progress bar structured as `<nav aria-label="Referral creation progress"><ol>` with `aria-current="step"` on active stages.
- **Urgency & Feedback**: Emergency banners and submission errors announce dynamically using `role="alert"` and `aria-live="assertive"`.
- **Keyboard Interactivity**: All custom interactive cards (priority level radios, destination hospital cards, patient search items) feature `tabIndex={0}`, `onKeyDown` handlers (Space/Enter), `focus-visible:ring-2`, and `role="radio"` / `role="button"` semantics.
- **Mobile Responsive Design**: Wizard steps and grid columns collapse smoothly across mobile screens (360px+), tablets, and high-density desktop displays.

---

### 8. VERIFICATION & TEST RESULTS

Automated test execution using Node.js built-in test runner:

```
npm run test:frontend
```

**Results:**
- Total Test Suites: **8 suites**
- Total Frontend Tests: **71 tests**
- Pass: **71 / 71 (100%)**
- Fail: **0**
- Duration: **2.30s**

**Part 19 Specific Suite (`shared/tests/healthCentreReferralCreation.test.js`):**
- ✔ 1. Referral Creation Route Structure & Security in App.jsx (3.4ms)
- ✔ 2. Referral Creation Service Gateway Contracts (0.6ms)
- ✔ 3. Referral Step Wizard Architecture & Step Definitions (2.3ms)
- ✔ 4. Patient Selection & Referral Initiation (Step 1) (3.6ms)
- ✔ 5. Clinical Referral Information Capture & Vitals Range Rules (Step 2) (2.5ms)
- ✔ 6. Destination Hospital & Specialty Selection (Step 3) (2.4ms)
- ✔ 7. Document Attachments Validation & File Security (Step 4) (3.4ms)
- ✔ 8. Referral Review, Verification & Submission Confirmation (Steps 5 & Confirmation) (6.5ms)
- ✔ 9. Privacy, Security & Facility Tenancy Isolation Verification (3.3ms)

**Production Build Verification (`npm run build:health`):**
- Vite build completed in 42.89s with zero errors.
- Bundle output: `CreateReferralPage-DpmerqhY.js` (72.41 kB gzip: 16.03 kB).

**Standards Verification (`npm run check:standards`):**
- 196 JavaScript/JSX files scanned: 0 syntax or secret anomalies.
- All four independent portals validated.

---

### 9. COMMIT LOG (COMMITS 145–152)

| Commit # | Git Commit Hash | Commit Message | Key Changes |
|---|---|---|---|
| **145** | `0a238f1` | `frontend: establish health centre referral creation architecture` | Referral creation service gateway, 5-step indicator, `/referrals/new` route mount. |
| **146** | `1da8aa8` | `frontend: implement patient selection and referral initiation` | Patient search directory step, query param pre-selection, demographic card. |
| **147** | `c20c0e5` | `frontend: implement structured clinical referral information form` | Clinical urgency selection, diagnosis, clinical history, physiological vitals bounds, transport toggle. |
| **148** | `a3a959a` | `frontend: implement hospital and service destination selection` | Destination hospital directory, Ethiopian region filter, specialty service selection. |
| **149** | `ed0324a` | `frontend: implement referral document attachment and review` | Document uploader (max 10MB, PDF/PNG/JPG), comprehensive clinical review step with section jumps. |
| **150** | `3d66f85` | `frontend: implement referral submission and confirmation` | Referral submission execution, duplicate lock, reference code display, print and track actions. |
| **151** | `94c80cf` | `frontend: improve referral creation security accessibility and usability` | ARIA attributes, keyboard navigation, focus rings, zero localStorage persistence, zero PII logging. |
| **152** | `de74b3a` | `test: verify health centre referral creation and submission workflows` | Test suite in `shared/tests/healthCentreReferralCreation.test.js`, progress tracker, and Part 19 report. |
