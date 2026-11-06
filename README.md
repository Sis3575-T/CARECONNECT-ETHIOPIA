# CareConnect Ethiopia — AI-Powered Smart Healthcare Referral and Patient Coordination System

**CareConnect Ethiopia** is an enterprise-grade digital health referral and patient coordination platform designed specifically for the Ethiopian healthcare ecosystem. It bridges communication gaps between rural and urban health centres, specialized referral hospitals, emergency transport fleets, and regional health bureaus.

---

## Architecture: Four Independent Frontend Portals

In accordance with strict architectural requirements, CareConnect Ethiopia consists of **four completely independent, runnable, and maintainable frontend applications** running in parallel on dedicated development ports. Each portal features its own dedicated Vite runtime, router configuration, authentication interface, theme controller, navigation sidebar, and specialized clinical/operational workflows.

### Zero Mock Data / Live Persistent Synchronized Architecture
All components across all four portals interact with a live persistent state architecture:
- **Centralized Data Service (`shared/services/dataService.js`)**: Real-time cross-tab & cross-port synchronizer utilizing `BroadcastChannel('careconnect_et_bus')` and browser persistent storage.
- **Reactive Hook (`shared/hooks/useCareConnectData.js`)**: Exposes live state and real mutations to components with zero static mock dependencies.
- **REST Backend Server (`server/server.js`)**: Independent file-backed JSON persistence server running on port `5000` with full CORS support.
- **Inter-Portal Reactivity**: When a clinician in the **Health Centre Portal** submits a referral, it immediately appears in the **Hospital Portal's** triage queue. When the hospital accepts and allocates a bed, the **Transport Coordinator Portal** updates with the emergency dispatch request. When the ambulance driver moves en-route, all portals reflect the live transit status in real time.

```text
careconnect-ethiopia/
│
├── portals/
│   ├── health-centre/         # Port 5173: Primary Healthcare, AI OCR Referral Creation
│   │   ├── src/
│   │   │   ├── components/    # OCR Upload, Completeness Radar, Facility Selectors
│   │   │   ├── layouts/       # Health Centre Navigation & Bilingual Header
│   │   │   ├── pages/         # Dashboard, Patients, Create Referral, All Referrals, Hospitals,
│   │   │   │                  # Tracking, AI Review, Reports, AIAssistant, Login
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js     # Configured for Port 5173
│   │
│   ├── hospital/              # Port 5174: Specialized Triage, Bed Capacity, Arrivals
│   │   ├── src/
│   │   │   ├── components/    # Capacity Gauge, Triage Priority Badges
│   │   │   ├── layouts/       # Emerald Clinical Layout & Emergency Alerts
│   │   │   ├── pages/         # Dashboard, Incoming Referrals, Pending, Accepted, Rejected,
│   │   │   │                  # Capacity Management, Facility Services, Patient Arrivals, Feedback, Reports
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js     # Configured for Port 5174
│   │
│   ├── transport/             # Port 5175: Ambulance Dispatch, Telemetry & Map Tracking
│   │   ├── src/
│   │   │   ├── components/    # Ambulance Fleet Status, Route Waypoints
│   │   │   ├── layouts/       # Purple Dispatch Layout & Active En-Route Counters
│   │   │   ├── pages/         # Dashboard, Transport Requests, In-Transit, Resources, Map Tracking, Reports
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js     # Configured for Port 5175
│   │
│   └── administrator/         # Port 5176: System Governance, RBAC, AI Subsystem Tuning
│       ├── src/
│       │   ├── layouts/       # Deep Navy Governance Layout & Audit Stream
│       │   ├── pages/         # Dashboard, Users, Roles & Permissions, Facilities, Capacity Monitoring,
│       │   │                  # Referral Monitoring, AI Subsystems (AI-01 - AI-09), AI Performance,
│       │   │                  # Platform Analytics, Audit Logs, Settings
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── index.html
│       ├── package.json
│       └── vite.config.js     # Configured for Port 5176
│
├── server/                    # Standalone REST API persistence backend
│   ├── server.js              # Node.js HTTP/REST server (Port 5000)
│   └── data/database.json     # Auto-seeded persistent database
│
├── shared/                    # Shared hooks, services, and baseline schema
│   ├── data/
│   │   └── initialSeedData.js # Comprehensive realistic Ethiopian healthcare seed records
│   ├── services/
│   │   ├── dataService.js     # Live synchronized persistent data engine
│   │   └── apiClient.js       # Axios client with bearer auth interceptors
│   └── hooks/
│       ├── useCareConnectData.js # Reactive React data hook for all 4 portals
│       └── useTheme.js        # Universal light / dark theme hook
│
├── package.json               # Root orchestration scripts
└── README.md
```

---

## Development Ports and Local URLs

| Application / Portal | Local Port | URL | Primary Users | Primary Functions |
|:---|:---:|:---|:---|:---|
| **Health Centre Portal** | `5173` | [http://localhost:5173](http://localhost:5173) | Health Officers, Nurses, Primary Clinicians | Patient intake, AI OCR paper referral digitization, hospital recommendations, tracking |
| **Hospital Portal** | `5174` | [http://localhost:5174](http://localhost:5174) | Triage Officers, Chief Medical Officers, Specialists | Referral acceptance/rejection (FR-22), live bed/ICU capacity reporting, arrival confirmation |
| **Transport Coordinator Portal** | `5175` | [http://localhost:5175](http://localhost:5175) | Dispatchers, Ambulance Drivers, Logistics | Emergency ambulance assignment, live transit telemetry, delay alerts, route tracking |
| **System Administrator Portal** | `5176` | [http://localhost:5176](http://localhost:5176) | Ministry of Health, System Admins, AI Engineers | User RBAC, facility registry, AI subsystems toggle (AI-01–09), benchmark monitoring |

---

## Available NPM Scripts

### Running Portals in Development

Each portal can be launched independently. Stopping one portal does **not** stop the other three:

```bash
# Optional: Launch File-Backed Persistent REST Backend (Port 5000)
npm run server

# 1. Launch Health Centre Portal (Port 5173)
npm run dev:health

# 2. Launch Hospital Portal (Port 5174)
npm run dev:hospital

# 3. Launch Transport Coordinator Portal (Port 5175)
npm run dev:transport

# 4. Launch System Administrator Portal (Port 5176)
npm run dev:admin

# 5. Launch All 4 Portals + Backend Simultaneously
npm run dev:all
```

### Production Build Scripts

Each portal builds cleanly and independently into its target bundle:

```bash
# Build Health Centre Portal
npm run build:health

# Build Hospital Portal
npm run build:hospital

# Build Transport Coordinator Portal
npm run build:transport

# Build System Administrator Portal
npm run build:admin

# Build All 4 Portals Concurrently
npm run build:all
```

---

## Portal Feature Highlights

### 1. Health Centre Portal (`http://localhost:5173`)
- **Visual Identity**: Medical Sky Blue (`#0284c7`), high legibility clinical styling.
- **Key Capabilities & Pages**:
  - **Dashboard (`/`)**: Live statistics, referral volume trends, status breakdown, AI quick match, and direct actions.
  - **Patient Management (`/patients`)**: Search, blood type & gender filters, Register Patient modal, Edit Patient modal, and comprehensive Patient Referral History dossier.
  - **Create Referral (`/create-referral`)**: 8-section MoH Form (demographics, facility, service, clinical indications, priority review, attachment OCR ingest, draft saving, and pre-submission validation preview).
  - **All Referrals (`/referrals`)**: Filterable registry with status filters, referral detail drawer, and CSV export.
  - **Hospital Recommendations (`/hospitals`)**: AI-ranked suitability score, distance in km, real-time bed & ICU capacities, side-by-side hospital comparison modal, and pre-fill referral action.
  - **Referral Tracking (`/tracking`)**: Visual milestone stepper (Submitted &rarr; Hospital Accepted &rarr; Transport Dispatched &rarr; In Transit &rarr; Arrived &rarr; Feedback Issued).
  - **AI OCR Processing (`/ai-review`)**: Simulated document scanner, entity extraction preview, editable fields, and missing clinical data alerts.
  - **Bilingual AI Clinical Assistant (`/ai-assistant`)**: Conversational support in both English and Amharic with clinical quick prompts.
  - **Reports & Analytics (`/reports`)**: Referral completion rates, category breakdown, and downloadable CSV analytics.

### 2. Hospital Portal (`http://localhost:5174`)
- **Visual Identity**: Deep Emerald & Teal (`#059669`, `#0f766e`), acute care clinical design.
- **Key Capabilities & Pages**:
  - **Dashboard (`/`)**: Live triage queue, emergency alerts, bed occupancy gauge, and recent clinical activities.
  - **Incoming Triage Queue (`/incoming`)**: Comprehensive triage stream with rapid Acknowledge, Accept with Bed Allocation, and Reject actions.
  - **Pending Referrals (`/pending`)**: Dedicated view of awaiting referrals with urgency indicators.
  - **Accepted Referrals (`/accepted`)**: Confirmed inbound patients with arrival check-in action.
  - **Rejected Referrals Registry (`/rejected`)**: Complete history of declined cases with certified FR-22 clinical justifications.
  - **Mandatory Rejection Justification Modal (FR-22)**: Enforces structured clinical justifications (e.g., ICU Bed Shortage, Specialist Off Duty, Equipment Maintenance) with alternative routing suggestions.
  - **Capacity Management (`/capacity`)**: Live reporting form for general beds, ICU beds, oxygen reserves, and mechanical ventilators publishing updates to other portals.
  - **Facility Services Management (`/services`)**: Manage department operational status, specialist on-call readiness, and operational bed counts.
  - **Patient Arrivals (`/arrivals`)**: Real-time arrival confirmation and hospital intake check-in.
  - **Clinical Feedback Channel (`/feedback`)**: Post-discharge clinical summaries and follow-up guidance transmitted back to referring primary health centres.
  - **Reports (`/reports`)**: Triage response times, acceptance vs rejection ratios, and CSV export.

### 3. Transport Coordinator Portal (`http://localhost:5175`)
- **Visual Identity**: Electric Purple & Indigo (`#6d28d9`), high-visibility dispatch styling.
- **Key Capabilities & Pages**:
  - **Dashboard (`/`)**: Active transfers, fleet availability, dispatch lifecycle stepper, and live telemetry feed.
  - **Transport Requests (`/requests`)**: Real emergency requests with vehicle and driver dispatch modal (departure time, projected ETA).
  - **In-Transit Transfers (`/in-transit`)**: Active transfer surveillance with delay incident reporting modal and milestone stepper.
  - **Fleet & Transport Resources (`/resources`)**: Ambulance fleet registry with Add Vehicle modal and status toggles.
  - **Interactive Map Tracking (`/tracking`)**: Leaflet & OpenStreetMap visualization with custom facility & ambulance markers, route polylines, and real coordinates across Ethiopian corridors.
  - **Performance Reports (`/reports`)**: Median transit times, on-time arrival metrics, and CSV export.

### 4. System Administrator Portal (`http://localhost:5176`)
- **Visual Identity**: Deep Navy & Slate (`#1e3a8a`, `#0f172a`), administrative command console.
- **Key Capabilities & Pages**:
  - **System Overview Dashboard (`/`)**: Global platform health, facility counts, active users, 6-month trajectory line chart, and glowing AI performance vector.
  - **User Management (`/users`)**: Search, filter by role/status, Create User modal, Edit User modal, View Profile modal, status toggling, and CSV export.
  - **Roles & Permissions Matrix (`/roles`)**: Dedicated RBAC matrix displaying all permissions across all 4 roles with clinical confidentiality notes.
  - **Health Facilities Registry (`/facilities`)**: Comprehensive directory, Register Facility modal, Edit modal, operating status toggle, and CSV export.
  - **Capacity Monitoring (`/capacity-monitoring`)**: System-wide multi-hospital capacity surveillance with critical surge alerts (< 15% available beds) and real-time adjustment modal.
  - **Referral Monitoring & Audit (`/referrals`)**: System-wide surveillance of referral lifecycle, transfer latency audit, and administrative guardrail notice.
  - **AI Subsystem Control Center (`/ai-management`)**: Feature toggles for all 9 AI microservices (AI-01 to AI-09) with instant persistent audit logging.
  - **AI Performance & Evaluation Metrics (`/ai-performance`)**: Empirical benchmarks (precision, recall, F1, latency) with explicit distinction for unbenchmarked models.
  - **Platform Analytics (`/analytics`)**: Cross-regional referral volume bar chart, 6-month trends, and downloadable CSV summary.
  - **Security & Compliance Audit Trail (`/audit-logs`)**: Chronological audit trail with user signatures, IP records, action filters, and CSV export.
  - **System Settings (`/settings`)**: Health data privacy compliance controls, session timeout configuration, and dark/light mode toggles.

---

## Technological Specifications

- **UI Framework**: React 18 with Vite 5 (Pure Modern JavaScript / JSX — No TypeScript)
- **Styling**: Tailwind CSS with customized color palettes per portal, complete Dark Mode support
- **Shared Tokens**: CSS variables and theme tokens defined in `shared/styles/theme.css`
- **Icons**: Lucide React
- **Analytics & Data Visualization**: Recharts (Pie, Bar, Area, Donut charts)
- **API & State**: Axios with token interceptors and mock fallback data
- **Forms**: React Hook Form
- **Mapping**: Leaflet and React-Leaflet
- **Backend API**: Node.js v20+ / Express 5 with Helmet, CORS whitelist, and JWT authentication
- **AI Microservice**: Python 3.12+ FastAPI with Tesseract OCR, OpenCV, and Scikit-learn
- **Database**: PostgreSQL on Neon Cloud with SSL encryption, connection pooling, and zero-leakage logging

---

## Service Directory & Port Map

| Service / Application | Port | Technology | Role |
|---|---|---|---|
| **Health Centre Portal** | `5173` | React / Vite | Patient intake, referral drafting, OCR uploads |
| **Hospital Portal** | `5174` | React / Vite | Triage queue, bed capacity, arrival check-in |
| **Transport Portal** | `5175` | React / Vite | Ambulance dispatch, route telemetry, delay logging |
| **Administrator Portal** | `5176` | React / Vite | RBAC governance, facility registry, audit trail |
| **Main Backend API** | `5000` | Node / Express | REST API, referral state machine, auth tokens |
| **AI Decision Service** | `8000` | Python / FastAPI| Document OCR & clinical recommendation ranking |
| **PostgreSQL Database** | `5432` | Neon Cloud / PG | Relational schema, migrations & seed persistence |

---

## Getting Started & Development Commands

```bash
# 1. Environment Setup
cp .env.example .env

# 2. Verify Port Availability
npm run check:ports

# 3. Code Standards & Architecture Validation
npm run check:standards

# 4. Execute Test Suites
npm run test:backend   # Express API and Auth suites (60+ tests)
npm run test:db        # Database migration and connection security suites

# 5. Launch Independent Portals & Services
npm run dev:health     # Health Centre Portal (Port 5173)
npm run dev:hospital   # Hospital Portal (Port 5174)
npm run dev:transport  # Transport Portal (Port 5175)
npm run dev:admin      # Administrator Portal (Port 5176)
npm run dev:backend    # Express REST API (Port 5000)
npm run dev:ai         # Python FastAPI AI Service (Port 8000)
```

---

## Documentation Library

- [Complete Project Overview](file:///C:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/PROJECT_OVERVIEW.md)
- [System Architecture](file:///C:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/ARCHITECTURE.md)
- [Environment Configuration Guide](file:///C:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/ENVIRONMENT.md)
- [Security & Secret Management](file:///C:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/SECURITY.md)
- [Database Architecture & Neon Setup](file:///C:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/DATABASE.md)
- [Code Quality & Engineering Standards](file:///C:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/CODE_STANDARDS.md)
- [Part 01 Development Report](file:///C:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/PART_01_REPORT.md)

---

## Ethiopian Context and Data Privacy Notice

All healthcare facilities (Tikur Anbessa Specialized Hospital, St. Paul's Hospital Millennium Medical College, Kazanchis Health Centre, Kotebe Health Centre, etc.), patient records, national IDs, and telephone numbers featured in this development prototype are **fictional simulations created solely for demonstration, testing, and UI validation purposes** in accordance with Ethiopian national healthcare confidentiality principles.

---

## License

CareConnect Ethiopia is licensed under the MIT License. Developed for Ethiopian healthcare modernization.
