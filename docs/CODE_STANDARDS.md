# CareConnect Ethiopia — Code Quality & Engineering Standards

## 1. Overview & Principles

CareConnect Ethiopia enforces strict, consistent coding, formatting, and architecture standards across all four frontend portals, the main Node.js API, the Python AI microservice, and database migrations.

---

## 2. Naming Conventions

| Category | Convention | Examples |
|---|---|---|
| **JavaScript Files (Backend/Scripts)** | `camelCase.js` | `dbService.js`, `errorHandler.js`, `devOrchestrator.js` |
| **React Components & Pages** | `PascalCase.jsx` | `HealthCentreLayout.jsx`, `DashboardPage.jsx`, `CreateReferralModal.jsx` |
| **Python Modules & Functions** | `snake_case.py` | `ocr_service.py`, `recommendation_engine.py`, `extract_text()` |
| **Database Tables** | `snake_case` (Plural) | `referrals`, `healthcare_facilities`, `audit_logs` |
| **Database Columns** | `snake_case` | `patient_id`, `created_at`, `assigned_facility_id` |
| **SQL Migrations** | `NNN_description.sql` | `001_initial_migration_tracker.sql`, `008_create_referrals.sql` |
| **Constants & Enums** | `UPPER_SNAKE_CASE` | `DEFAULT_PORT`, `REFERRAL_STATUS`, `TRIAGE_PRIORITY` |
| **CSS Classes** | Utility classes via Tailwind | `flex items-center justify-between text-slate-800` |

---

## 3. Formatting Standards

Standardized via `.prettierrc.json`:
- **Indentation:** 2 spaces (no hard tabs).
- **Quotes:** Single quotes for JavaScript/JSX strings (`'single'`), double quotes for JSON.
- **Semicolons:** Always required (`"semi": true`).
- **Line Length:** 100 characters maximum.
- **Trailing Commas:** Omitted in single-line statements, clean multi-line objects.
- **Line Endings:** Clean LF / auto-normalized across OS environments.

---

## 4. Error Handling Conventions

- **Centralized Operational Errors:** Extend `AppError` (`backend/src/utils/errors.js`) with an explicit HTTP status code and machine-readable error code.
  - `ValidationError`: HTTP 400
  - `UnauthorizedError`: HTTP 401
  - `ForbiddenError`: HTTP 403
  - `NotFoundError`: HTTP 404
  - `ConflictError`: HTTP 409
- **No Uncaught Exceptions:** Every asynchronous route must either use `asyncHandler` or route through the centralized Express error handler (`backend/src/middleware/errorHandler.js`).
- **Never Leak Stack Traces in Production:** Detailed stack traces are suppressed when `NODE_ENV=production`.

---

## 5. Structured Logging Conventions

- Every incoming HTTP request is assigned a unique `X-Request-Id` (UUID v4) via `backend/src/middleware/logger.js`.
- Downstream microservice calls (e.g. to AI service) must propagate the `X-Request-Id` header for end-to-end distributed tracing.
- Never log raw passwords, authorization headers, or database connection strings containing credentials.

---

## 6. Testing Conventions

- **Backend Unit & Integration Tests:** Native Node.js test runner (`node --test`) under `backend/tests/`.
- **Database Integrity Tests:** Schema and relational constraint verification under `database/tests/`.
- **AI Service Tests:** Pytest under `ai-service/tests/`.
- **Fictional Data Only:** Test suites and database seeds must use strictly fictional demo data with Ethiopian cultural context. Never use real patient data.
